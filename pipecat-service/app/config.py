import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        self.LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "")
        self.LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "")
        self.LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "")
        self.DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
        self.DEEPGRAM_STT_MODEL: str = os.getenv("DEEPGRAM_STT_MODEL", "flux-general-en")
        self.DEEPGRAM_FALLBACK_STT_MODEL: str = os.getenv(
            "DEEPGRAM_FALLBACK_STT_MODEL", "nova-3-general"
        )
        self.DEEPGRAM_FLUX_REQUIRED: bool = (
            os.getenv("DEEPGRAM_FLUX_REQUIRED", "false").lower() == "true"
        )
        self.CARTESIA_API_KEY: str = os.getenv("CARTESIA_API_KEY", "")
        self.CARTESIA_MODEL: str = os.getenv("CARTESIA_MODEL", "sonic-3")
        self.CARTESIA_MAX_BUFFER_DELAY_MS: int = int(
            os.getenv("CARTESIA_MAX_BUFFER_DELAY_MS", "0")
        )
        self.OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
        self.XAI_API_KEY: str = os.getenv("XAI_API_KEY", "")
        self.XAI_API_BASE_URL: str = os.getenv("XAI_API_BASE_URL", "https://api.x.ai/v1")
        self.SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
        self.SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.CONVERSATION_MODEL: str = os.getenv(
            "CONVERSATION_MODEL", "google/gemini-2.5-flash-lite-preview-09-2025"
        )
        self.CONVERSATION_FALLBACK_MODEL: str = os.getenv("CONVERSATION_FALLBACK_MODEL", "")
        self.ANALYSIS_MODEL: str = os.getenv("ANALYSIS_MODEL", "moonshotai/kimi-k2.5")
        self.INFER_ROLE_MODEL: str = os.getenv(
            "INFER_ROLE_MODEL", "google/gemini-2.5-flash-lite-preview-09-2025"
        )
        self.VOICE_USE_EAGER_EOT: bool = (
            os.getenv("VOICE_USE_EAGER_EOT", "true").lower() == "true"
        )
        self.VOICE_EAGER_EOT_THRESHOLD: float = float(
            os.getenv("VOICE_EAGER_EOT_THRESHOLD", "0.6")
        )
        self.VOICE_EOT_THRESHOLD: float = float(os.getenv("VOICE_EOT_THRESHOLD", "0.8"))
        self.VOICE_EOT_TIMEOUT_MS: int = int(os.getenv("VOICE_EOT_TIMEOUT_MS", "1500"))
        self.VOICE_CALIBRATION_NOISE_SECS: float = float(
            os.getenv("VOICE_CALIBRATION_NOISE_SECS", "1.0")
        )
        self.VOICE_CALIBRATION_VOICE_SECS: float = float(
            os.getenv("VOICE_CALIBRATION_VOICE_SECS", "3.5")
        )
        self.VOICE_CALIBRATION_MIN_VOICE_SNR_DB: float = float(
            os.getenv("VOICE_CALIBRATION_MIN_VOICE_SNR_DB", "3.0")
        )
        self.VOICE_CALIBRATION_MIN_VALID_VOICE_SECS: float = float(
            os.getenv("VOICE_CALIBRATION_MIN_VALID_VOICE_SECS", "1.0")
        )
        self.VOICE_CALIBRATION_MAX_SECS: float = float(
            os.getenv("VOICE_CALIBRATION_MAX_SECS", "8.0")
        )
        self.VOICE_AUDIO_GUARD_MIN_SNR_DB: float = float(
            os.getenv("VOICE_AUDIO_GUARD_MIN_SNR_DB", "6.0")
        )
        self.VOICE_AUDIO_GUARD_REJECT_THRESHOLD: float = float(
            os.getenv("VOICE_AUDIO_GUARD_REJECT_THRESHOLD", "0.35")
        )
        self.VOICE_AUDIO_GUARD_TARGET_THRESHOLD: float = float(
            os.getenv("VOICE_AUDIO_GUARD_TARGET_THRESHOLD", "0.55")
        )
        self.VOICE_CONTEXT_MAX_TURNS: int = int(os.getenv("VOICE_CONTEXT_MAX_TURNS", "4"))
        self.VOICE_TTS_FIRST_CHUNK_TOKENS: int = int(
            os.getenv("VOICE_TTS_FIRST_CHUNK_TOKENS", "8")
        )
        self.VOICE_TTS_FIRST_CHUNK_MIN_TOKENS: int = int(
            os.getenv("VOICE_TTS_FIRST_CHUNK_MIN_TOKENS", "4")
        )
        self.VOICE_TTS_FIRST_CHUNK_MAX_WAIT_MS: int = int(
            os.getenv("VOICE_TTS_FIRST_CHUNK_MAX_WAIT_MS", "250")
        )
        self.VOICE_TTS_SUBSEQUENT_CHUNK_TOKENS: int = int(
            os.getenv("VOICE_TTS_SUBSEQUENT_CHUNK_TOKENS", "8")
        )

        self._validate()

    @staticmethod
    def _is_flux_model(model: str) -> bool:
        return model.strip().lower().startswith("flux")

    def _validate(self):
        if not self._is_flux_model(self.DEEPGRAM_STT_MODEL):
            return

        if not 0.5 <= self.VOICE_EOT_THRESHOLD <= 0.9:
            raise ValueError(
                "VOICE_EOT_THRESHOLD must be between 0.5 and 0.9 for Deepgram Flux"
            )

        if self.VOICE_USE_EAGER_EOT:
            if not 0.3 <= self.VOICE_EAGER_EOT_THRESHOLD <= 0.9:
                raise ValueError(
                    "VOICE_EAGER_EOT_THRESHOLD must be between 0.3 and 0.9 for Deepgram Flux"
                )
            if self.VOICE_EAGER_EOT_THRESHOLD > self.VOICE_EOT_THRESHOLD:
                raise ValueError(
                    "VOICE_EAGER_EOT_THRESHOLD must be less than or equal to VOICE_EOT_THRESHOLD"
                )

        if not 500 <= self.VOICE_EOT_TIMEOUT_MS <= 10000:
            raise ValueError(
                "VOICE_EOT_TIMEOUT_MS must be between 500 and 10000 for Deepgram Flux"
            )

        if self.VOICE_AUDIO_GUARD_REJECT_THRESHOLD > self.VOICE_AUDIO_GUARD_TARGET_THRESHOLD:
            raise ValueError(
                "VOICE_AUDIO_GUARD_REJECT_THRESHOLD must be less than or equal to VOICE_AUDIO_GUARD_TARGET_THRESHOLD"
            )


settings = Settings()
