"""Unit tests for AmbientNoiseEstimator."""

from __future__ import annotations

import asyncio

import numpy as np
import pytest
from pipecat.frames.frames import InputAudioRawFrame, StartFrame
from pipecat.processors.frame_processor import FrameDirection

from app.pipelines.processors.ambient_noise_estimator import AmbientNoiseEstimator


SR = 16000
CHUNK_SECS = 0.02


def _chunk(rms_target: float) -> bytes:
    samples = int(SR * CHUNK_SECS)
    amp = int(rms_target * 32768)
    return np.full(samples, amp, dtype=np.int16).tobytes()


async def _feed(est: AmbientNoiseEstimator, rms: float, secs: float) -> None:
    n = int(secs / CHUNK_SECS)
    chunk = _chunk(rms)
    for _ in range(n):
        f = InputAudioRawFrame(audio=chunk, sample_rate=SR, num_channels=1)
        await est.process_frame(f, FrameDirection.DOWNSTREAM)
        await asyncio.sleep(CHUNK_SECS)


@pytest.mark.asyncio
async def test_quiet_then_noisy_then_quiet():
    est = AmbientNoiseEstimator(threshold_rms=0.012, window_secs=1.0)
    await est.queue_frame(StartFrame(audio_in_sample_rate=SR), FrameDirection.DOWNSTREAM)

    await _feed(est, rms=0.005, secs=1.5)
    assert est.is_noisy() is False

    await _feed(est, rms=0.05, secs=1.5)
    assert est.is_noisy() is True
    noisy_after_step = est.noisy_mode_active_secs
    assert noisy_after_step >= 1.0

    await _feed(est, rms=0.005, secs=1.5)
    assert est.is_noisy() is False
    # Noisy seconds counter must NOT regress when state goes back to quiet.
    assert est.noisy_mode_active_secs >= noisy_after_step


@pytest.mark.asyncio
async def test_passthrough_does_not_drop_frames():
    """Estimator must forward every audio frame untouched."""
    est = AmbientNoiseEstimator(threshold_rms=0.012)
    await est.queue_frame(StartFrame(audio_in_sample_rate=SR), FrameDirection.DOWNSTREAM)

    sink: list = []

    async def collect(frame, direction):
        sink.append(type(frame).__name__)

    # Monkey-patch the parent push mechanism with a stub.
    est.push_frame = collect  # type: ignore[assignment]

    chunk = _chunk(0.01)
    for _ in range(5):
        await est.process_frame(
            InputAudioRawFrame(audio=chunk, sample_rate=SR, num_channels=1),
            FrameDirection.DOWNSTREAM,
        )
    assert sink.count("InputAudioRawFrame") == 5
