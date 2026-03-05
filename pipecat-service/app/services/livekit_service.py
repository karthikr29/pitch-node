import asyncio
import time
from typing import Any
from datetime import datetime, timezone

from livekit.api import (
    AccessToken,
    EncodedFileOutput,
    EncodedFileType,
    EgressStatus,
    ListEgressRequest,
    LiveKitAPI,
    RoomCompositeEgressRequest,
    S3Upload,
    StopEgressRequest,
    VideoGrants,
)
from livekit.protocol.room import CreateRoomRequest, DeleteRoomRequest
from loguru import logger

from app.config import settings
from app.pipelines.sales_pipeline import create_sales_pipeline
from app.services.supabase_service import SupabaseService

PIPELINE_STOP_TIMEOUT_SECS = 1.5
RECORDING_POLL_INTERVAL_SECS = 1.0
RECORDING_POLL_MAX_ATTEMPTS = 20
RECORDING_TERMINAL_STATUSES = {
    EgressStatus.EGRESS_COMPLETE,
    EgressStatus.EGRESS_FAILED,
    EgressStatus.EGRESS_ABORTED,
    EgressStatus.EGRESS_LIMIT_REACHED,
}


class LiveKitService:
    def __init__(self):
        self._active_pipelines: dict[str, asyncio.Task] = {}
        self._session_rooms: dict[str, str] = {}  # session_id -> room_name
        self._session_recording_egress: dict[str, str] = {}  # session_id -> egress_id
        self._recording_finalize_tasks: set[asyncio.Task] = set()
        self._recording_config_warning_emitted = False
        self._supabase_service = SupabaseService()

    @staticmethod
    def _utc_now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _build_recording_path(user_id: str, session_id: str) -> str:
        return f"{user_id}/{session_id}/{int(time.time())}-recording.mp3"

    @staticmethod
    def _extract_duration_seconds(info: Any) -> int | None:
        file_info = None
        file_results = list(getattr(info, "file_results", []) or [])
        if file_results:
            file_info = file_results[0]
        elif getattr(info, "file", None):
            file_info = info.file

        if not file_info:
            return None

        raw = getattr(file_info, "duration", None)
        if raw is None:
            return None

        try:
            value = int(raw)
        except Exception:
            return None

        if value <= 0:
            return None
        if value > 1_000_000_000:
            return max(1, int(value / 1_000_000_000))
        if value > 1000:
            return max(1, int(value / 1000))
        return value

    def _recording_bucket_for_egress(self) -> str:
        return settings.LIVEKIT_EGRESS_S3_BUCKET or settings.RECORDING_BUCKET

    def _recording_enabled(self) -> bool:
        if not settings.RECORDING_ENABLED:
            return False

        required_values = [
            settings.LIVEKIT_EGRESS_S3_ACCESS_KEY,
            settings.LIVEKIT_EGRESS_S3_SECRET_KEY,
            settings.LIVEKIT_EGRESS_S3_ENDPOINT,
            self._recording_bucket_for_egress(),
        ]
        if all(required_values):
            return True

        if not self._recording_config_warning_emitted:
            logger.warning(
                "Recording is enabled but egress S3 settings are incomplete; audio recording will be skipped."
            )
            self._recording_config_warning_emitted = True
        return False

    def _create_livekit_api(self) -> LiveKitAPI:
        return LiveKitAPI(
            url=settings.LIVEKIT_URL,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )

    async def create_room_and_token(self, room_name: str, participant_name: str) -> str:
        """Create a LiveKit room and return a participant token for the user."""
        api = self._create_livekit_api()
        try:
            await api.room.create_room(CreateRoomRequest(name=room_name))
            logger.info(f"Created LiveKit room: {room_name}")
        finally:
            await api.aclose()

        token = (
            AccessToken(
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            .with_identity(participant_name)
            .with_name(participant_name)
            .with_grants(VideoGrants(
                room_join=True,
                room=room_name,
            ))
        )

        return token.to_jwt()

    def _generate_bot_token(self, room_name: str, bot_identity: str = "ai-assistant") -> str:
        """Generate a token for the AI bot to join the room."""
        token = (
            AccessToken(
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            .with_identity(bot_identity)
            .with_name("AI Assistant")
            .with_grants(VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            ))
        )
        return token.to_jwt()

    async def _delete_room_for_session(self, session_id: str):
        room_name = self._session_rooms.pop(session_id, None)
        if not room_name:
            return

        try:
            api = self._create_livekit_api()
            try:
                await api.room.delete_room(DeleteRoomRequest(room=room_name))
                logger.info(f"Deleted LiveKit room: {room_name}")
            finally:
                await api.aclose()
        except Exception as e:
            logger.error(f"Failed to delete LiveKit room {room_name}: {e}")

    async def _start_recording(self, session_id: str, room_name: str, user_id: str):
        if not self._recording_enabled():
            return

        storage_bucket = self._recording_bucket_for_egress()
        storage_path = self._build_recording_path(user_id, session_id)
        egress_id: str | None = None

        try:
            api = self._create_livekit_api()
            try:
                output = EncodedFileOutput(
                    file_type=EncodedFileType.MP3,
                    filepath=storage_path,
                    s3=S3Upload(
                        access_key=settings.LIVEKIT_EGRESS_S3_ACCESS_KEY,
                        secret=settings.LIVEKIT_EGRESS_S3_SECRET_KEY,
                        region=settings.LIVEKIT_EGRESS_S3_REGION,
                        endpoint=settings.LIVEKIT_EGRESS_S3_ENDPOINT,
                        bucket=storage_bucket,
                        force_path_style=settings.LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE,
                    ),
                )
                request = RoomCompositeEgressRequest(
                    room_name=room_name,
                    audio_only=True,
                    file=output,
                )
                info = await api.egress.start_room_composite_egress(request)
                egress_id = info.egress_id
            finally:
                await api.aclose()

            self._session_recording_egress[session_id] = egress_id
            await self._supabase_service.upsert_session_recording(
                session_id,
                {
                    "provider": "livekit",
                    "provider_recording_id": egress_id,
                    "status": "recording",
                    "storage_bucket": storage_bucket,
                    "storage_path": storage_path,
                    "mime_type": "audio/mpeg",
                    "started_at": self._utc_now_iso(),
                    "error_message": None,
                },
            )
        except Exception as e:
            logger.warning(f"Failed to start recording for session {session_id}: {e}")
            await self._supabase_service.mark_session_recording_failed(
                session_id=session_id,
                error_message=str(e),
                provider_recording_id=egress_id,
                storage_bucket=storage_bucket,
                storage_path=storage_path,
            )

    async def _finalize_recording(self, session_id: str, stop_first: bool):
        egress_id = self._session_recording_egress.pop(session_id, None)
        if not egress_id:
            return

        await self._supabase_service.update_session_recording_status(
            session_id=session_id,
            status="processing",
            provider_recording_id=egress_id,
        )

        api = self._create_livekit_api()
        try:
            if stop_first:
                try:
                    await api.egress.stop_egress(StopEgressRequest(egress_id=egress_id))
                except Exception as stop_error:
                    logger.warning(
                        f"Failed to stop egress {egress_id} for session {session_id}: {stop_error}"
                    )

            terminal_info = None
            for _ in range(RECORDING_POLL_MAX_ATTEMPTS):
                try:
                    response = await api.egress.list_egress(ListEgressRequest(egress_id=egress_id))
                except Exception as list_error:
                    logger.warning(
                        f"Unable to query egress {egress_id} state for session {session_id}: {list_error}"
                    )
                    await asyncio.sleep(RECORDING_POLL_INTERVAL_SECS)
                    continue

                items = list(getattr(response, "items", []) or [])
                info = items[0] if items else None
                if not info:
                    await asyncio.sleep(RECORDING_POLL_INTERVAL_SECS)
                    continue

                if info.status in RECORDING_TERMINAL_STATUSES:
                    terminal_info = info
                    break
                await asyncio.sleep(RECORDING_POLL_INTERVAL_SECS)

            if not terminal_info:
                await self._supabase_service.mark_session_recording_failed(
                    session_id=session_id,
                    provider_recording_id=egress_id,
                    error_message="Recording finalization timed out before terminal egress state.",
                )
                return

            if terminal_info.status == EgressStatus.EGRESS_COMPLETE:
                duration_seconds = self._extract_duration_seconds(terminal_info)
                await self._supabase_service.mark_session_recording_ready(
                    session_id=session_id,
                    provider_recording_id=egress_id,
                    duration_seconds=duration_seconds,
                )
                return

            status_name = EgressStatus.Name(terminal_info.status)
            error_message = getattr(terminal_info, "error", "") or f"Egress exited with {status_name}."
            await self._supabase_service.mark_session_recording_failed(
                session_id=session_id,
                provider_recording_id=egress_id,
                error_message=error_message,
            )
        finally:
            await api.aclose()

    def _queue_recording_finalize(self, session_id: str, stop_first: bool):
        if session_id not in self._session_recording_egress:
            return

        task = asyncio.create_task(self._finalize_recording(session_id, stop_first=stop_first))
        self._recording_finalize_tasks.add(task)
        task.add_done_callback(lambda done: self._recording_finalize_tasks.discard(done))

    async def _handle_pipeline_task_done(self, session_id: str, pipeline_task: asyncio.Task):
        tracked_task = self._active_pipelines.get(session_id)
        if tracked_task is not pipeline_task:
            # Task no longer belongs to this session lifecycle (usually manual stop path).
            return

        self._active_pipelines.pop(session_id, None)

        if pipeline_task.cancelled():
            logger.info(f"Pipeline task cancelled for session {session_id}")
            await self._delete_room_for_session(session_id)
            self._queue_recording_finalize(session_id, stop_first=True)
            return

        try:
            result = pipeline_task.result() or {}
        except Exception as e:
            logger.error(f"Pipeline task failed for session {session_id}: {e}")
            await self._delete_room_for_session(session_id)
            self._queue_recording_finalize(session_id, stop_first=True)
            return

        auto_complete_session = bool(result.get("auto_complete_session"))
        end_reason: Any = result.get("end_reason")

        if auto_complete_session:
            logger.info(
                f"Pipeline requested automatic session completion for {session_id}. "
                f"Reason: {end_reason}"
            )
            await self._supabase_service.complete_session(session_id)
            await self._delete_room_for_session(session_id)
            self._queue_recording_finalize(session_id, stop_first=True)
            return

        logger.info(
            f"Pipeline finished for session {session_id} without auto-complete. "
            "Session finalization remains with explicit end-session flow."
        )

    async def start_pipeline(
        self,
        room_name: str,
        session_id: str,
        user_id: str,
        scenario: dict,
        persona: dict,
        pitch_context: str = "",
        pitch_briefing: dict | None = None,
        inferred_role: str | None = None,
    ):
        """Start the voice AI pipeline for a session."""
        # Store the room name for this session so we can delete it later.
        self._session_rooms[session_id] = room_name

        if self._recording_enabled():
            await self._start_recording(session_id=session_id, room_name=room_name, user_id=user_id)
            cleanup_task = asyncio.create_task(
                self._supabase_service.cleanup_expired_recordings(limit=100)
            )
            cleanup_task.add_done_callback(
                lambda task: logger.debug(
                    f"Recording cleanup task failed: {task.exception()}"
                ) if not task.cancelled() and task.exception() else None
            )

        # Generate a token for the bot to join the room.
        bot_token = self._generate_bot_token(room_name, f"ai-{session_id[:8]}")

        pipeline_task = asyncio.create_task(
            create_sales_pipeline(
                room_name=room_name,
                session_id=session_id,
                scenario=scenario,
                persona=persona,
                livekit_url=settings.LIVEKIT_URL,
                bot_token=bot_token,
                pitch_context=pitch_context,
                pitch_briefing=pitch_briefing,
                inferred_role=inferred_role,
            )
        )
        self._active_pipelines[session_id] = pipeline_task
        pipeline_task.add_done_callback(
            lambda done_task: asyncio.create_task(self._handle_pipeline_task_done(session_id, done_task))
        )

    async def stop_pipeline(self, session_id: str):
        """Stop the pipeline for a session and delete the LiveKit room."""
        task = self._active_pipelines.pop(session_id, None)
        if task and not task.done():
            task.cancel()
            try:
                await asyncio.wait_for(task, timeout=PIPELINE_STOP_TIMEOUT_SECS)
            except asyncio.CancelledError:
                logger.info(f"Pipeline cancelled for session {session_id}")
            except asyncio.TimeoutError:
                logger.warning(
                    f"Pipeline cancellation timed out for session {session_id}; continuing shutdown"
                )
            except Exception as e:
                logger.warning(
                    f"Pipeline raised during shutdown for session {session_id}: {e}"
                )
            else:
                logger.info(f"Pipeline stopped cleanly for session {session_id}")

        await self._delete_room_for_session(session_id)
        self._queue_recording_finalize(session_id, stop_first=True)
