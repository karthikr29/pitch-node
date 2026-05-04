import os
import sys
from datetime import datetime, timedelta, timezone

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.loguru import LoguruIntegration
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.services.supabase_service import SupabaseService
from loguru import logger

_sentry_dsn = os.getenv("SENTRY_DSN")
_under_pytest = "pytest" in sys.modules or "PYTEST_CURRENT_TEST" in os.environ

def _before_send(event, hint):
    message = event.get("message") or event.get("logentry", {}).get("message") or ""
    logger_name = event.get("logger") or ""
    if (
        logger_name == "livekit"
        and "livekit_api::signal_client::signal_stream" in message
        and "Connection reset by peer" in message
    ):
        return None
    return event

if _sentry_dsn and not _under_pytest:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=os.getenv("RAILWAY_ENVIRONMENT", "development"),
        traces_sample_rate=1.0,
        send_default_pii=False,
        before_send=_before_send,
        integrations=[
            FastApiIntegration(),
            LoguruIntegration(),
        ],
    )

debug = os.getenv("APP_DEBUG", "false").lower() == "true"

app = FastAPI(
    title="ConvoSparr Voice Pipeline",
    version="1.0.0",
    docs_url="/docs" if debug else None,
    redoc_url="/redoc" if debug else None,
    openapi_url="/openapi.json" if debug else None,
)

allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or [],
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(router, prefix="/api/v1")

@app.on_event("startup")
async def reconcile_orphaned_sessions():
    """On startup, mark sessions that were left connecting/active as abandoned."""
    try:
        supabase = SupabaseService()
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        result = (
            supabase.client.table("sessions")
            .update({"status": "abandoned"})
            .in_("status", ["connecting", "active"])
            .lt("created_at", cutoff)
            .execute()
        )
        count = len(result.data or [])
        if count > 0:
            logger.info(f"Startup reconciliation: marked {count} orphaned sessions as abandoned")
    except Exception as e:
        logger.error(f"Startup reconciliation failed: {e}")

@app.get("/health")
async def health():
    return {"status": "ok"}
