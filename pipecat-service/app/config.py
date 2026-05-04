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
            os.getenv("VOICE_EAGER_EOT_THRESHOLD", "0.35")
        )
        self.VOICE_EOT_THRESHOLD: float = float(os.getenv("VOICE_EOT_THRESHOLD", "0.5"))
        self.VOICE_EOT_TIMEOUT_MS: int = int(os.getenv("VOICE_EOT_TIMEOUT_MS", "700"))
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

        self.VAD_CONFIDENCE: float = float(os.getenv("VAD_CONFIDENCE", "0.85"))
        self.VAD_START_SECS: float = float(os.getenv("VAD_START_SECS", "0.3"))
        self.VAD_STOP_SECS_QUIET: float = float(os.getenv("VAD_STOP_SECS_QUIET", "0.2"))
        self.VAD_STOP_SECS_NOISY: float = float(os.getenv("VAD_STOP_SECS_NOISY", "0.4"))
        self.VAD_MIN_VOLUME: float = float(os.getenv("VAD_MIN_VOLUME", "0.7"))
        self.VAD_NOISE_DETECT_RMS: float = float(
            os.getenv("VAD_NOISE_DETECT_RMS", "0.012")
        )

        self.STT_MIN_AVG_WORD_CONFIDENCE: float = float(
            os.getenv("STT_MIN_AVG_WORD_CONFIDENCE", "0.55")
        )

        self.VERIFICATION_SIMILARITY_THRESHOLD: float = float(
            os.getenv("VERIFICATION_SIMILARITY_THRESHOLD", "0.70")
        )
        self.VERIFICATION_WINDOW_MS: int = int(os.getenv("VERIFICATION_WINDOW_MS", "1500"))
        self.VERIFICATION_MIN_AUDIO_SECS: float = float(
            os.getenv("VERIFICATION_MIN_AUDIO_SECS", "1.0")
        )
        self.VERIFICATION_LENIENT_SHORT_SEGMENTS: bool = (
            os.getenv("VERIFICATION_LENIENT_SHORT_SEGMENTS", "false").lower() == "true"
        )
        self.VERIFICATION_DECISION_DEADLINE_MS: int = int(
            os.getenv("VERIFICATION_DECISION_DEADLINE_MS", "250")
        )

        self.VOICEPRINT_ENROLL_MAX_AUDIO_BYTES: int = int(
            os.getenv("VOICEPRINT_ENROLL_MAX_AUDIO_BYTES", "400000")
        )
        self.VOICEPRINT_ENROLL_MIN_DURATION_MS: int = int(
            os.getenv("VOICEPRINT_ENROLL_MIN_DURATION_MS", "2000")
        )
        self.VOICEPRINT_ENROLL_MAX_DURATION_MS: int = int(
            os.getenv("VOICEPRINT_ENROLL_MAX_DURATION_MS", "8000")
        )

        self.REJECTION_CUE_THRESHOLD_SECS: float = float(
            os.getenv("REJECTION_CUE_THRESHOLD_SECS", "12.0")
        )
        self.REJECTION_AUTO_END_THRESHOLD_SECS: float = float(
            os.getenv("REJECTION_AUTO_END_THRESHOLD_SECS", "32.0")
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

        if not 1 <= self.VOICE_EOT_TIMEOUT_MS <= 2000:
            raise ValueError(
                "VOICE_EOT_TIMEOUT_MS must be between 1 and 2000 for Deepgram Flux"
            )

        if not 0.0 < self.VAD_CONFIDENCE <= 1.0:
            raise ValueError("VAD_CONFIDENCE must be in (0.0, 1.0]")
        if not 0.0 < self.VAD_START_SECS <= 2.0:
            raise ValueError("VAD_START_SECS must be in (0.0, 2.0]")
        if not 0.0 < self.VAD_STOP_SECS_QUIET <= 2.0:
            raise ValueError("VAD_STOP_SECS_QUIET must be in (0.0, 2.0]")
        if not 0.0 < self.VAD_STOP_SECS_NOISY <= 2.0:
            raise ValueError("VAD_STOP_SECS_NOISY must be in (0.0, 2.0]")
        if self.VAD_STOP_SECS_NOISY < self.VAD_STOP_SECS_QUIET:
            raise ValueError("VAD_STOP_SECS_NOISY must be >= VAD_STOP_SECS_QUIET")
        if not 0.0 <= self.VAD_MIN_VOLUME <= 1.0:
            raise ValueError("VAD_MIN_VOLUME must be in [0.0, 1.0]")
        if not 0.0 < self.VAD_NOISE_DETECT_RMS < 1.0:
            raise ValueError("VAD_NOISE_DETECT_RMS must be in (0.0, 1.0)")

        if not 0.0 <= self.STT_MIN_AVG_WORD_CONFIDENCE <= 1.0:
            raise ValueError("STT_MIN_AVG_WORD_CONFIDENCE must be in [0.0, 1.0]")

        if not 0.0 < self.VERIFICATION_SIMILARITY_THRESHOLD < 1.0:
            raise ValueError("VERIFICATION_SIMILARITY_THRESHOLD must be in (0.0, 1.0)")
        if not 100 <= self.VERIFICATION_WINDOW_MS <= 10000:
            raise ValueError("VERIFICATION_WINDOW_MS must be in [100, 10000]")
        if not 0.0 < self.VERIFICATION_MIN_AUDIO_SECS <= 5.0:
            raise ValueError("VERIFICATION_MIN_AUDIO_SECS must be in (0.0, 5.0]")
        if not 50 <= self.VERIFICATION_DECISION_DEADLINE_MS <= 1000:
            raise ValueError("VERIFICATION_DECISION_DEADLINE_MS must be in [50, 1000]")

        if not 1000 <= self.VOICEPRINT_ENROLL_MAX_AUDIO_BYTES <= 2_000_000:
            raise ValueError(
                "VOICEPRINT_ENROLL_MAX_AUDIO_BYTES must be in [1000, 2000000]"
            )
        if self.VOICEPRINT_ENROLL_MIN_DURATION_MS < 500:
            raise ValueError("VOICEPRINT_ENROLL_MIN_DURATION_MS must be >= 500")
        if self.VOICEPRINT_ENROLL_MAX_DURATION_MS < self.VOICEPRINT_ENROLL_MIN_DURATION_MS:
            raise ValueError(
                "VOICEPRINT_ENROLL_MAX_DURATION_MS must be >= VOICEPRINT_ENROLL_MIN_DURATION_MS"
            )

        if self.REJECTION_AUTO_END_THRESHOLD_SECS <= self.REJECTION_CUE_THRESHOLD_SECS:
            raise ValueError(
                "REJECTION_AUTO_END_THRESHOLD_SECS must be > REJECTION_CUE_THRESHOLD_SECS"
            )


settings = Settings()
