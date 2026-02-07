import asyncio
from typing import Any

from livekit.api import AccessToken, LiveKitAPI, VideoGrants
from livekit.protocol.room import CreateRoomRequest, DeleteRoomRequest
from loguru import logger

from app.config import settings
from app.pipelines.sales_pipeline import create_sales_pipeline
from app.services.supabase_service import SupabaseService

PIPELINE_STOP_TIMEOUT_SECS = 1.5


class LiveKitService:
    def __init__(self):
        self._active_pipelines: dict[str, asyncio.Task] = {}
        self._session_rooms: dict[str, str] = {}  # session_id -> room_name
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

    async def _handle_pipeline_task_done(self, session_id: str, pipeline_task: asyncio.Task):
        tracked_task = self._active_pipelines.get(session_id)
        if tracked_task is not pipeline_task:
            # Task no longer belongs to this session lifecycle (usually manual stop path).
            return

        self._active_pipelines.pop(session_id, None)

        if pipeline_task.cancelled():
            logger.info(f"Pipeline task cancelled for session {session_id}")
            return

        try:
            result = pipeline_task.result() or {}
        except Exception as e:
            logger.error(f"Pipeline task failed for session {session_id}: {e}")
            await self._delete_room_for_session(session_id)
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
            return

        logger.info(
            f"Pipeline finished for session {session_id} without auto-complete. "
            "Session finalization remains with explicit end-session flow."
        )

    async def start_pipeline(self, room_name: str, session_id: str, scenario: dict, persona: dict):
        """Start the voice AI pipeline for a session."""
        # Store the room name for this session so we can delete it later.
        self._session_rooms[session_id] = room_name

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
