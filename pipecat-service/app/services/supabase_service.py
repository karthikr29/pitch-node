from supabase import create_client, Client
from datetime import datetime, timezone
from loguru import logger
from app.config import settings

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    async def get_scenario(self, scenario_id: str) -> dict | None:
        try:
            result = self.client.table("scenarios").select("*").eq("id", scenario_id).single().execute()
            return result.data
        except Exception:
            return None

    async def get_persona(self, persona_id: str) -> dict | None:
        try:
            result = self.client.table("personas").select("*").eq("id", persona_id).single().execute()
            return result.data
        except Exception:
            return None

    async def save_transcript(self, session_id: str, entries: list[dict]):
        if entries:
            self.client.table("session_transcripts").insert(
                [{"session_id": session_id, **e} for e in entries]
            ).execute()

    async def save_analytics(self, session_id: str, analytics: dict):
        self.client.table("session_analytics").upsert({
            "session_id": session_id,
            **analytics,
        }).execute()

    async def complete_session(self, session_id: str):
        """Mark a session completed and compute duration from started_at."""
        try:
            result = (
                self.client.table("sessions")
                .select("started_at,status")
                .eq("id", session_id)
                .single()
                .execute()
            )
            session = result.data or {}

            ended_at_dt = datetime.now(timezone.utc)
            ended_at = ended_at_dt.isoformat()

            duration_seconds = 0
            started_at = session.get("started_at")
            if started_at:
                try:
                    started_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                    duration_seconds = max(
                        0, int((ended_at_dt - started_dt).total_seconds())
                    )
                except Exception:
                    duration_seconds = 0

            (
                self.client.table("sessions")
                .update(
                    {
                        "status": "completed",
                        "ended_at": ended_at,
                        "duration_seconds": duration_seconds,
                    }
                )
                .eq("id", session_id)
                .execute()
            )
        except Exception as e:
            logger.error(f"Failed to mark session {session_id} completed: {e}")
