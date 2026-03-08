from app.config import settings

DEFAULT_GROK_MODEL = "grok-4-1-fast-reasoning"
XAI_MODEL_ALIASES = {
    "x-ai/grok-4.1-fast": "grok-4-1-fast-reasoning",
    "xai/grok-4.1-fast": "grok-4-1-fast-reasoning",
    "grok-4.1-fast": "grok-4-1-fast-reasoning",
    "x-ai/grok-4.1": "grok-4-1",
    "xai/grok-4.1": "grok-4-1",
    "grok-4.1": "grok-4-1",
}


def normalize_grok_model_name(model: str | None) -> str:
    if not model:
        return DEFAULT_GROK_MODEL

    normalized = XAI_MODEL_ALIASES.get(model.strip(), model.strip())
    return normalized.removeprefix("x-ai/").removeprefix("xai/")


def get_xai_chat_completions_url() -> str:
    return f"{settings.XAI_API_BASE_URL.rstrip('/')}/chat/completions"


def get_xai_headers() -> dict[str, str]:
    if not settings.XAI_API_KEY:
        raise RuntimeError("XAI_API_KEY is not configured")

    return {
        "Authorization": f"Bearer {settings.XAI_API_KEY}",
        "Content-Type": "application/json",
    }
