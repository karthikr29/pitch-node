import random

from supabase import create_client, Client
from datetime import datetime, timedelta, timezone
from loguru import logger
from app.config import settings


class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    @staticmethod
    def _utc_now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

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

    async def upsert_session_recording(self, session_id: str, payload: dict):
        now = self._utc_now_iso()
        self.client.table("session_recordings").upsert(
            {
                "session_id": session_id,
                "updated_at": now,
                **payload,
            },
            on_conflict="session_id",
        ).execute()

    async def update_session_recording_status(
        self,
        session_id: str,
        status: str,
        **fields,
    ):
        self.client.table("session_recordings").update(
            {
                "status": status,
                "updated_at": self._utc_now_iso(),
                **fields,
            }
        ).eq("session_id", session_id).execute()

    async def mark_session_recording_ready(
        self,
        session_id: str,
        provider_recording_id: str,
        duration_seconds: int | None = None,
    ):
        completed_at = datetime.now(timezone.utc)
        expires_at = completed_at + timedelta(days=max(1, settings.RECORDING_RETENTION_DAYS))
        await self.update_session_recording_status(
            session_id,
            "ready",
            provider_recording_id=provider_recording_id,
            mime_type="audio/mpeg",
            completed_at=completed_at.isoformat(),
            expires_at=expires_at.isoformat(),
            duration_seconds=duration_seconds,
            error_message=None,
        )

    async def mark_session_recording_failed(
        self,
        session_id: str,
        error_message: str,
        provider_recording_id: str | None = None,
        storage_bucket: str | None = None,
        storage_path: str | None = None,
        provider: str = "livekit",
    ):
        if storage_bucket and storage_path:
            await self.upsert_session_recording(
                session_id,
                {
                    "provider": provider,
                    "provider_recording_id": provider_recording_id,
                    "status": "failed",
                    "storage_bucket": storage_bucket,
                    "storage_path": storage_path,
                    "mime_type": "audio/mpeg",
                    "error_message": error_message[:500],
                },
            )
            return

        await self.update_session_recording_status(
            session_id,
            "failed",
            provider_recording_id=provider_recording_id,
            error_message=error_message[:500],
        )

    async def cleanup_expired_recordings(self, limit: int = 100):
        now = self._utc_now_iso()
        try:
            result = (
                self.client.table("session_recordings")
                .select("id, storage_bucket, storage_path")
                .eq("status", "ready")
                .lte("expires_at", now)
                .limit(limit)
                .execute()
            )
            rows = result.data or []
            for row in rows:
                bucket = row.get("storage_bucket")
                path = row.get("storage_path")
                if bucket and path:
                    try:
                        self.client.storage.from_(bucket).remove([path])
                    except Exception as storage_error:
                        logger.warning(
                            f"Failed removing expired recording object {bucket}/{path}: {storage_error}"
                        )
                try:
                    (
                        self.client.table("session_recordings")
                        .update(
                            {
                                "status": "expired",
                                "updated_at": now,
                            }
                        )
                        .eq("id", row.get("id"))
                        .execute()
                    )
                except Exception as update_error:
                    logger.warning(f"Failed updating expired recording row {row.get('id')}: {update_error}")
        except Exception as e:
            logger.warning(f"Recording cleanup skipped due to error: {e}")

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
