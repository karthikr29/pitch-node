import random

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
            persona = result.data
            if persona:
                variants = persona.get("voice_variants") or []
                if variants and persona.get("cartesia_voice_id"):
                    all_voices = [persona["cartesia_voice_id"]] + list(variants)
                    persona["cartesia_voice_id"] = random.choice(all_voices)
                    logger.info(f"Selected voice variant: {persona['cartesia_voice_id']} for persona {persona['name']}")
            return persona
        except Exception:
            return None

    def _session_exists(self, session_id: str) -> bool:
        try:
            result = (
                self.client.table("sessions")
                .select("id")
                .eq("id", session_id)
                .single()
                .execute()
            )
            return bool(result.data)
        except Exception:
            return False

    async def save_transcript(self, session_id: str, entries: list[dict]):
        if not entries:
            return
        try:
            if not self._session_exists(session_id):
                logger.warning(f"save_transcript: session {session_id} not found, skipping")
                return
            self.client.table("session_transcripts").insert(
                [{"session_id": session_id, **e} for e in entries]
            ).execute()
        except Exception as e:
            logger.error(f"Failed to save transcript for session {session_id}: {e}")

    async def save_analytics(self, session_id: str, analytics: dict):
        try:
            if not self._session_exists(session_id):
                logger.warning(f"save_analytics: session {session_id} not found, skipping")
                return
            self.client.table("session_analytics").upsert({
                "session_id": session_id,
                **analytics,
            }).execute()
        except Exception as e:
            logger.error(f"Failed to save analytics for session {session_id}: {e}")

    async def complete_session(self, session_id: str):
        """Mark a session completed and charge credits through the database RPC."""
        try:
            ended_at = datetime.now(timezone.utc).isoformat()
            result = self.client.rpc(
                "complete_session_with_credits",
                {
                    "p_session_id": session_id,
                    "p_ended_at": ended_at,
                },
            ).execute()
            completed = result.data[0] if result.data else {}
            logger.info(
                "Completed session {} duration={} charged={} already_charged={}",
                session_id,
                completed.get("duration_seconds"),
                completed.get("credits_charged_seconds"),
                completed.get("already_charged"),
            )
        except Exception as e:
            logger.error(f"Failed to mark session {session_id} completed: {e}")
