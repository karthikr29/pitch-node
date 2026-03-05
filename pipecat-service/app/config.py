import os
from dotenv import load_dotenv

load_dotenv()


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "")
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "")
    LIVEKIT_EGRESS_S3_ACCESS_KEY: str = os.getenv("LIVEKIT_EGRESS_S3_ACCESS_KEY", "")
    LIVEKIT_EGRESS_S3_SECRET_KEY: str = os.getenv("LIVEKIT_EGRESS_S3_SECRET_KEY", "")
    LIVEKIT_EGRESS_S3_REGION: str = os.getenv("LIVEKIT_EGRESS_S3_REGION", "us-east-1")
    LIVEKIT_EGRESS_S3_ENDPOINT: str = os.getenv("LIVEKIT_EGRESS_S3_ENDPOINT", "")
    LIVEKIT_EGRESS_S3_BUCKET: str = os.getenv("LIVEKIT_EGRESS_S3_BUCKET", "")
    LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE: bool = _env_bool(
        "LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE", True
    )
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    CARTESIA_API_KEY: str = os.getenv("CARTESIA_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    CONVERSATION_MODEL: str = os.getenv("CONVERSATION_MODEL", "meta-llama/llama-3.1-70b-instruct")
    CONVERSATION_FALLBACK_MODEL: str = os.getenv("CONVERSATION_FALLBACK_MODEL", "")
    ANALYSIS_MODEL: str = os.getenv("ANALYSIS_MODEL", "moonshotai/kimi-k2.5")
    RECORDING_ENABLED: bool = _env_bool("RECORDING_ENABLED", True)
    RECORDING_BUCKET: str = os.getenv("RECORDING_BUCKET", "session-recordings")
    RECORDING_RETENTION_DAYS: int = int(os.getenv("RECORDING_RETENTION_DAYS", "30"))

settings = Settings()
