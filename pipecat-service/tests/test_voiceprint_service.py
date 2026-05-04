"""Unit tests for VoiceprintService and audio quality helpers."""

from __future__ import annotations

import numpy as np
import pytest

from app.services.voiceprint_service import (
    VOICEPRINT_EMBEDDING_DIM,
    VoiceprintQualityError,
    VoiceprintService,
    assess_audio_quality,
    enforce_enrollment_quality,
    pcm16_bytes_to_float,
)


SR = 16000


def _speech(secs: float, *, formant_shift: float = 1.0, seed: int = 0) -> np.ndarray:
    """Synthesize speech-shaped audio (formant tones modulated by syllable env)."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(SR * secs)) / SR
    fund = 0.4 * np.sin(2 * np.pi * (150 * formant_shift) * t)
    f1 = 0.2 * np.sin(2 * np.pi * (700 * formant_shift) * t)
    f2 = 0.1 * np.sin(2 * np.pi * (1500 * formant_shift) * t)
    env = 0.5 + 0.5 * np.cos(2 * np.pi * 3 * t)
    return ((fund + f1 + f2) * env + 0.02 * rng.standard_normal(t.size)).astype(np.float32)


def test_encode_decode_roundtrip():
    emb = np.random.randn(VOICEPRINT_EMBEDDING_DIM).astype(np.float32)
    emb /= np.linalg.norm(emb)
    b64 = VoiceprintService.encode(emb)
    decoded = VoiceprintService.decode(b64)
    assert decoded.shape == emb.shape
    assert decoded.dtype == np.float32
    assert np.allclose(decoded, emb, atol=1e-6)


def test_decode_rejects_wrong_length():
    bad = VoiceprintService.encode(np.zeros(100, dtype=np.float32))
    with pytest.raises(ValueError):
        VoiceprintService.decode(bad)


def test_cosine_basic():
    a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    b = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    c = np.array([-1.0, 0.0, 0.0], dtype=np.float32)
    assert VoiceprintService.cosine(a, b) == pytest.approx(1.0)
    assert VoiceprintService.cosine(a, c) == pytest.approx(-1.0)


def test_pcm16_bytes_to_float():
    samples = np.array([0, 16384, -16384, 32767, -32768], dtype=np.int16)
    out = pcm16_bytes_to_float(samples.tobytes())
    assert out.dtype == np.float32
    assert out[0] == pytest.approx(0.0)
    assert out[1] == pytest.approx(0.5, rel=1e-3)
    assert out[2] == pytest.approx(-0.5, rel=1e-3)
    assert out[3] == pytest.approx(1.0, rel=1e-3)
    # int16 min is -32768 → -1.0 exactly with /32768 scale
    assert out[4] == pytest.approx(-1.0, rel=1e-3)


def test_pcm16_bytes_handles_odd_length():
    out = pcm16_bytes_to_float(b"\x00\x00\x01")  # 3 bytes -> drops last
    assert out.shape == (1,)


def test_quality_quiet_rejected():
    pcm = np.zeros(int(SR * 4), dtype=np.float32)
    report = assess_audio_quality(pcm, SR)
    with pytest.raises(VoiceprintQualityError) as ei:
        enforce_enrollment_quality(report)
    assert ei.value.code == "TOO_QUIET"


def test_quality_too_loud_rejected():
    pcm = np.full(int(SR * 4), 0.999, dtype=np.float32)
    report = assess_audio_quality(pcm, SR)
    with pytest.raises(VoiceprintQualityError) as ei:
        enforce_enrollment_quality(report)
    assert ei.value.code == "TOO_LOUD"


def test_quality_too_short_voiced_ratio():
    # Short burst then long silence => low voiced ratio
    pcm = np.zeros(int(SR * 4), dtype=np.float32)
    pcm[: SR // 4] = 0.3  # 250 ms of voiced signal in 4s
    report = assess_audio_quality(pcm, SR)
    assert report.voiced_ratio < 0.20
    with pytest.raises(VoiceprintQualityError) as ei:
        enforce_enrollment_quality(report)
    assert ei.value.code == "TOO_SHORT"


def test_quality_speech_accepted():
    pcm = _speech(4.0)
    report = assess_audio_quality(pcm, SR)
    enforce_enrollment_quality(report)
    assert report.snr_db > 6.0
    assert report.voiced_ratio > 0.5


def test_compute_embedding_shape_and_norm():
    pcm = _speech(4.0)
    emb = VoiceprintService.compute_embedding(pcm, SR)
    assert emb.shape == (VOICEPRINT_EMBEDDING_DIM,)
    assert emb.dtype == np.float32
    # L2-normalised
    assert np.linalg.norm(emb) == pytest.approx(1.0, rel=1e-3)


def test_same_speaker_high_similarity_other_low():
    a1 = VoiceprintService.compute_embedding(_speech(4.0, formant_shift=1.0, seed=1), SR)
    a2 = VoiceprintService.compute_embedding(_speech(4.0, formant_shift=1.0, seed=2), SR)
    b1 = VoiceprintService.compute_embedding(_speech(4.0, formant_shift=1.6, seed=3), SR)
    same = VoiceprintService.cosine(a1, a2)
    diff = VoiceprintService.cosine(a1, b1)
    assert same > diff, f"same={same} should be > diff={diff}"


def test_encoder_loaded_once():
    # First call may load; second call must reuse the singleton.
    VoiceprintService._ensure_loaded()
    e1 = VoiceprintService._encoder
    VoiceprintService._ensure_loaded()
    e2 = VoiceprintService._encoder
    assert e1 is e2
