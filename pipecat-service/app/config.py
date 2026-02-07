import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "")
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    CARTESIA_API_KEY: str = os.getenv("CARTESIA_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    CONVERSATION_MODEL: str = os.getenv("CONVERSATION_MODEL", "meta-llama/llama-3.1-70b-instruct")
    ANALYSIS_MODEL: str = os.getenv("ANALYSIS_MODEL", "anthropic/claude-3.5-sonnet")

settings = Settings()
