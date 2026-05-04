"""
Resemblyzer-backed voiceprint service.

Compute, encode, and compare 256-dim voice embeddings. The encoder is loaded
once per Pipecat process (singleton). Embeddings are L2-normalised, so cosine
similarity reduces to a dot product.

Usage:
    VoiceprintService._ensure_loaded()                         # warm-load at boot
    emb = VoiceprintService.compute_embedding(pcm_float, 16000)
    sim = VoiceprintService.cosine(emb_a, emb_b)
    b64 = VoiceprintService.encode(emb)
    emb = VoiceprintService.decode(b64)

Voiceprints are never persisted to disk or to Supabase. They live only in
process RAM, scoped to a single session.
"""

from __future__ import annotations

import base64
import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

import numpy as np
from loguru import logger

if TYPE_CHECKING:  # pragma: no cover - only used for type hints
    from resemblyzer import VoiceEncoder


VOICEPRINT_EMBEDDING_DIM = 256


@dataclass(frozen=True)
class AudioQualityReport:
    """Result of validating raw PCM before / after voice embedding."""

    rms_p95: float
    peak_max: float
    voiced_ratio: float
    snr_db: float
    duration_secs: float


class VoiceprintQualityError(Exception):
    """Raised when audio fails one of the enrollment quality gates."""

    def __init__(self, code: str, message: str = ""):
        super().__init__(message or code)
        self.code = code


class VoiceprintService:
    _encoder: "VoiceEncoder | None" = None

    @classmethod
    def _ensure_loaded(cls) -> None:
        if cls._encoder is None:
            from resemblyzer import VoiceEncoder

            logger.info("Loading Resemblyzer VoiceEncoder (cpu)")
            cls._encoder = VoiceEncoder(device="cpu")
            logger.info("Resemblyzer VoiceEncoder ready")

    @classmethod
    def compute_embedding(
        cls,
        pcm_float: np.ndarray,
        sample_rate: int = 16000,
    ) -> np.ndarray:
        """Compute a 256-dim L2-normalised voice embedding.

        ``pcm_float`` must be a 1-D float32/float64 array in the range
        [-1, 1]. ``sample_rate`` is the rate of the input; Resemblyzer's
        ``preprocess_wav`` will resample to 16 kHz internally.
        """
        cls._ensure_loaded()
        from resemblyzer import preprocess_wav

        audio = np.asarray(pcm_float, dtype=np.float32)
        if audio.ndim != 1:
            raise ValueError("compute_embedding expects 1-D audio")
        wav = preprocess_wav(audio, source_sr=sample_rate)
        emb = cls._encoder.embed_utterance(wav)  # type: ignore[union-attr]
        return np.asarray(emb, dtype=np.float32)

    @staticmethod
    def encode(emb: np.ndarray) -> str:
        """Base64-encode a 256-float32 embedding for transport across HTTP."""
        if emb.dtype != np.float32:
            emb = emb.astype(np.float32)
        return base64.b64encode(emb.tobytes()).decode("ascii")

    @staticmethod
    def decode(b64: str) -> np.ndarray:
        raw = base64.b64decode(b64)
        emb = np.frombuffer(raw, dtype=np.float32)
        if emb.size != VOICEPRINT_EMBEDDING_DIM:
            raise ValueError(
                f"Decoded voiceprint has {emb.size} floats, expected {VOICEPRINT_EMBEDDING_DIM}"
            )
        return emb

    @staticmethod
    def cosine(a: np.ndarray, b: np.ndarray) -> float:
        """Cosine similarity for L2-normalised embeddings (dot product)."""
        return float(np.dot(a, b))


# ---------------------------------------------------------------------------
# Audio quality helpers
# ---------------------------------------------------------------------------


def pcm16_bytes_to_float(audio_bytes: bytes) -> np.ndarray:
    """Decode signed-16-bit little-endian PCM bytes into float32 in [-1, 1]."""
    if not audio_bytes:
        return np.zeros(0, dtype=np.float32)
    # Drop a trailing odd byte if present so np.int16 aligns cleanly.
    if len(audio_bytes) % 2:
        audio_bytes = audio_bytes[:-1]
    samples = np.frombuffer(audio_bytes, dtype=np.int16)
    return samples.astype(np.float32) / 32768.0


def assess_audio_quality(
    pcm_float: np.ndarray,
    sample_rate: int,
    *,
    voiced_rms_threshold: float = 0.01,
    frame_secs: float = 0.02,
) -> AudioQualityReport:
    """Compute RMS / peak / voiced-ratio / SNR features of a PCM buffer."""
    if pcm_float.size == 0:
        return AudioQualityReport(0.0, 0.0, 0.0, 0.0, 0.0)

    duration_secs = pcm_float.size / sample_rate
    frame_size = max(1, int(round(sample_rate * frame_secs)))
    n_frames = pcm_float.size // frame_size
    if n_frames < 1:
        # Single short window — treat as one frame.
        rms = float(np.sqrt(np.mean(pcm_float * pcm_float, dtype=np.float64)))
        peak = float(np.max(np.abs(pcm_float)))
        return AudioQualityReport(rms, peak, 1.0 if rms >= voiced_rms_threshold else 0.0, 0.0, duration_secs)

    trimmed = pcm_float[: n_frames * frame_size].reshape(n_frames, frame_size)
    rms_per_frame = np.sqrt(np.mean(trimmed * trimmed, axis=1, dtype=np.float64))
    peak_per_frame = np.max(np.abs(trimmed), axis=1)

    rms_p95 = float(np.percentile(rms_per_frame, 95))
    peak_max = float(np.max(peak_per_frame))
    voiced_mask = rms_per_frame >= voiced_rms_threshold
    voiced_ratio = float(np.mean(voiced_mask))

    if voiced_mask.any():
        signal_rms = float(np.median(rms_per_frame[voiced_mask]))
    else:
        signal_rms = float(np.max(rms_per_frame)) if rms_per_frame.size else 0.0

    if rms_per_frame.size:
        # Estimate noise from the lowest-RMS 250ms (or whole signal if shorter).
        noise_window_frames = max(1, int(round(0.25 / frame_secs)))
        sorted_rms = np.sort(rms_per_frame)
        noise_slice = sorted_rms[:noise_window_frames]
        noise_rms = float(np.mean(noise_slice)) if noise_slice.size else 0.0
    else:
        noise_rms = 0.0

    snr_db = 20.0 * math.log10(max(signal_rms, 1e-6) / max(noise_rms, 1e-6))
    return AudioQualityReport(
        rms_p95=rms_p95,
        peak_max=peak_max,
        voiced_ratio=voiced_ratio,
        snr_db=snr_db,
        duration_secs=duration_secs,
    )


def enforce_enrollment_quality(report: AudioQualityReport) -> None:
    """Raise VoiceprintQualityError if the report fails any enrollment gate."""
    if report.rms_p95 < 0.005:
        raise VoiceprintQualityError("TOO_QUIET")
    if report.peak_max > 0.95:
        raise VoiceprintQualityError("TOO_LOUD")
    if report.voiced_ratio < 0.20:
        raise VoiceprintQualityError("TOO_SHORT")
    if report.snr_db < 6.0:
        raise VoiceprintQualityError("TOO_NOISY")
