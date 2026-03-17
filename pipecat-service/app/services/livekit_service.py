import asyncio
from contextlib import suppress
from datetime import datetime, timezone
from typing import Any

from livekit.api import AccessToken, LiveKitAPI, VideoGrants
from livekit.protocol.room import CreateRoomRequest, DeleteRoomRequest
from loguru import logger

from app.config import settings
from app.pipelines.sales_pipeline import create_sales_pipeline
from app.services.supabase_service import SupabaseService

PIPELINE_STOP_TIMEOUT_SECS = 1.5
AUTO_END_FALLBACK_SECS = 2.0


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class LiveKitService:
    def __init__(self):
        self._active_pipelines: dict[str, asyncio.Task] = {}
        self._session_rooms: dict[str, str] = {}  # session_id -> room_name
        self._session_states: dict[str, dict[str, Any]] = {}
        self._auto_end_fallbacks: dict[str, asyncio.Task] = {}
        self._finalized_auto_end_sessions: set[str] = set()
        self._supabase_service = SupabaseService()

    async def create_room_and_token(self, room_name: str, participant_name: str) -> str:
        """Create a LiveKit room and return a participant token for the user."""
        api = LiveKitAPI(
            url=settings.LIVEKIT_URL,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
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
            api = LiveKitAPI(
                url=settings.LIVEKIT_URL,
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            try:
                await api.room.delete_room(DeleteRoomRequest(room=room_name))
                logger.info(f"Deleted LiveKit room: {room_name}")
            finally:
                await api.aclose()
        except Exception as e:
            logger.error(f"Failed to delete LiveKit room {room_name}: {e}")

    def _set_session_state(
        self,
        session_id: str,
        *,
        phase: str,
        auto_end_requested: bool,
        end_reason: Any = None,
    ):
        current = self._session_states.get(session_id, {})
        requested_at = current.get("requestedAt")
        if phase == "ending":
            requested_at = _utcnow_iso()

        self._session_states[session_id] = {
            "sessionId": session_id,
            "phase": phase,
            "autoEndRequested": auto_end_requested,
            "endReason": end_reason,
            "requestedAt": requested_at,
        }

    def get_session_state(self, session_id: str) -> dict[str, Any]:
        state = self._session_states.get(session_id)
        if state:
            return state.copy()
        return {
            "sessionId": session_id,
            "phase": "unknown",
            "autoEndRequested": False,
            "endReason": None,
            "requestedAt": None,
        }

    def _schedule_auto_end_fallback(self, session_id: str, reason: Any):
        self._set_session_state(
            session_id,
            phase="ending",
            auto_end_requested=True,
            end_reason=reason,
        )
        if session_id in self._finalized_auto_end_sessions:
            return

        existing = self._auto_end_fallbacks.get(session_id)
        if existing and not existing.done():
            return

        async def finalize_after_timeout():
            try:
                await asyncio.sleep(AUTO_END_FALLBACK_SECS)
                logger.warning(
                    f"Auto-end fallback firing for session {session_id}. "
                    f"Reason: {reason}"
                )
                await self._finalize_auto_completed_session(session_id, reason)
            except asyncio.CancelledError:
                raise
            finally:
                tracked = self._auto_end_fallbacks.get(session_id)
                if tracked is asyncio.current_task():
                    self._auto_end_fallbacks.pop(session_id, None)

        self._auto_end_fallbacks[session_id] = asyncio.create_task(finalize_after_timeout())

    async def _cancel_auto_end_fallback(self, session_id: str):
        task = self._auto_end_fallbacks.pop(session_id, None)
        if task and not task.done():
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    async def _finalize_auto_completed_session(self, session_id: str, end_reason: Any):
        if session_id in self._finalized_auto_end_sessions:
            return

        self._finalized_auto_end_sessions.add(session_id)
        self._set_session_state(
            session_id,
            phase="ending",
            auto_end_requested=True,
            end_reason=end_reason,
        )
        await self._delete_room_for_session(session_id)
        await self._supabase_service.complete_session(session_id)
        self._set_session_state(
            session_id,
            phase="ended",
            auto_end_requested=True,
            end_reason=end_reason,
        )

    async def _handle_pipeline_task_done(self, session_id: str, pipeline_task: asyncio.Task):
        tracked_task = self._active_pipelines.get(session_id)
        if tracked_task is not pipeline_task:
            # Task no longer belongs to this session lifecycle (usually manual stop path).
            return

        self._active_pipelines.pop(session_id, None)

        if pipeline_task.cancelled():
            await self._cancel_auto_end_fallback(session_id)
            logger.info(f"Pipeline task cancelled for session {session_id}")
            return

        try:
            result = pipeline_task.result() or {}
        except Exception as e:
            await self._cancel_auto_end_fallback(session_id)
            logger.error(f"Pipeline task failed for session {session_id}: {e}")
            await self._delete_room_for_session(session_id)
            self._set_session_state(
                session_id,
                phase="ended",
                auto_end_requested=False,
                end_reason=None,
            )
            return

        auto_complete_session = bool(result.get("auto_complete_session"))
        end_reason: Any = result.get("end_reason")

        if auto_complete_session:
            await self._cancel_auto_end_fallback(session_id)
            self._finalized_auto_end_sessions.discard(session_id)  # reset guard — fallback may have been cancelled mid-flight
            logger.info(
                f"Pipeline requested automatic session completion for {session_id}. "
                f"Reason: {end_reason}"
            )
            await self._finalize_auto_completed_session(session_id, end_reason)
            return

        await self._cancel_auto_end_fallback(session_id)
        logger.info(
            f"Pipeline finished for session {session_id} without auto-complete. "
            "Session finalization remains with explicit end-session flow."
        )

    async def start_pipeline(
        self,
        room_name: str,
        session_id: str,
        scenario: dict,
        persona: dict,
        pitch_context: str = "",
        pitch_briefing: dict | None = None,
        inferred_role: str | None = None,
    ):
        """Start the voice AI pipeline for a session."""
        # Store the room name for this session so we can delete it later.
        self._session_rooms[session_id] = room_name
        self._finalized_auto_end_sessions.discard(session_id)
        self._set_session_state(
            session_id,
            phase="active",
            auto_end_requested=False,
            end_reason=None,
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
                on_auto_end_requested=lambda reason: self._schedule_auto_end_fallback(
                    session_id, reason
                ),
            )
        )
        self._active_pipelines[session_id] = pipeline_task
        pipeline_task.add_done_callback(
            lambda done_task: asyncio.create_task(self._handle_pipeline_task_done(session_id, done_task))
        )

    async def stop_pipeline(self, session_id: str):
        """Stop the pipeline for a session and delete the LiveKit room."""
        await self._cancel_auto_end_fallback(session_id)
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
        current = self._session_states.get(session_id, {})
        self._set_session_state(
            session_id,
            phase="ended",
            auto_end_requested=bool(current.get("autoEndRequested")),
            end_reason=current.get("endReason"),
        )
