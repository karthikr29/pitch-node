from supabase import create_client, Client
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
