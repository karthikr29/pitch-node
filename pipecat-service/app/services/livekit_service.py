import asyncio
from typing import Optional
from livekit.api import LiveKitAPI, AccessToken, VideoGrants

from app.config import settings
from app.pipelines.sales_pipeline import create_sales_pipeline

class LiveKitService:
    def __init__(self):
        self._active_pipelines: dict[str, asyncio.Task] = {}

    async def create_room_and_token(self, room_name: str, participant_name: str) -> str:
        api = LiveKitAPI(
            url=settings.LIVEKIT_URL,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
        await api.room.create_room(name=room_name)

        token = AccessToken(
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
        token.identity = participant_name
        token.name = participant_name
        token.add_grant(VideoGrants(
            room_join=True,
            room=room_name,
        ))

        return token.to_jwt()

    async def start_pipeline(self, room_name: str, session_id: str, scenario: dict, persona: dict):
        pipeline_task = asyncio.create_task(
            create_sales_pipeline(room_name, session_id, scenario, persona)
        )
        self._active_pipelines[session_id] = pipeline_task

    async def stop_pipeline(self, session_id: str):
        task = self._active_pipelines.pop(session_id, None)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
