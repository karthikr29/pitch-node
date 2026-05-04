"""Unit tests for SpeakerVerificationProcessor."""

from __future__ import annotations

import asyncio

import numpy as np
import pytest
from pipecat.frames.frames import (
    InputAudioRawFrame,
    StartFrame,
    TranscriptionFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.processors.frame_processor import FrameDirection

from app.pipelines.processors.speaker_verification import (
    SpeakerVerificationProcessor,
    VerificationDecision,
)
from app.services.voiceprint_service import VoiceprintService


SR = 16000


def _speech(secs: float, *, formant_shift: float = 1.0, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    t = np.arange(int(SR * secs)) / SR
    fund = 0.4 * np.sin(2 * np.pi * (150 * formant_shift) * t)
    f1 = 0.2 * np.sin(2 * np.pi * (700 * formant_shift) * t)
    f2 = 0.1 * np.sin(2 * np.pi * (1500 * formant_shift) * t)
    env = 0.5 + 0.5 * np.cos(2 * np.pi * 3 * t)
    return ((fund + f1 + f2) * env + 0.02 * rng.standard_normal(t.size)).astype(np.float32)


def _pcm_bytes(audio: np.ndarray) -> bytes:
    return (np.clip(audio, -1, 1) * 32000).astype(np.int16).tobytes()


def _make_proc(voiceprint, *, threshold=0.70, lenient=False):
    rejections = {"count": 0}
    acceptances = {"count": 0}
    proc = SpeakerVerificationProcessor(
        session_id="s1",
        voiceprint=voiceprint,
        similarity_threshold=threshold,
        verification_window_ms=1500,
        min_audio_secs=1.0,
        lenient_short_segments=lenient,
        decision_deadline_ms=500,
        on_rejection=lambda: rejections.update(count=rejections["count"] + 1),
        on_acceptance=lambda: acceptances.update(count=acceptances["count"] + 1),
    )
    return proc, rejections, acceptances


async def _drive(proc, audio_pcm: bytes, push_collector: list):
    """Send VAD start, audio frames, VAD stop. Collect downstream pushes."""
    proc.push_frame = lambda frame, direction=FrameDirection.DOWNSTREAM: _collect(  # type: ignore[assignment]
        push_collector, frame, direction
    )

    await proc.queue_frame(StartFrame(audio_in_sample_rate=SR), FrameDirection.DOWNSTREAM)
    await proc.process_frame(UserStartedSpeakingFrame(), FrameDirection.DOWNSTREAM)

    # Stream audio in 320-byte chunks (10ms @ 16kHz mono PCM16)
    step = 320
    for i in range(0, len(audio_pcm), step):
        f = InputAudioRawFrame(
            audio=audio_pcm[i : i + step], sample_rate=SR, num_channels=1
        )
        await proc.process_frame(f, FrameDirection.DOWNSTREAM)

    await proc.process_frame(UserStoppedSpeakingFrame(), FrameDirection.DOWNSTREAM)


async def _collect(sink, frame, direction):
    sink.append(type(frame).__name__)


@pytest.mark.asyncio
async def test_no_voiceprint_passes_everything_through():
    proc, rej, acc = _make_proc(voiceprint=None)
    pushed: list = []
    proc.push_frame = lambda frame, direction=FrameDirection.DOWNSTREAM: _collect(  # type: ignore[assignment]
        pushed, frame, direction
    )
    await proc.queue_frame(StartFrame(audio_in_sample_rate=SR), FrameDirection.DOWNSTREAM)

    tx = TranscriptionFrame("hello", "user", "2024-01-01T00:00:00Z", None)
    await proc.process_frame(tx, FrameDirection.DOWNSTREAM)
    assert "TranscriptionFrame" in pushed
    assert rej["count"] == 0


@pytest.mark.asyncio
async def test_target_speaker_accepted():
    target = VoiceprintService.compute_embedding(_speech(4.0, formant_shift=1.0, seed=1), SR)
    proc, rej, acc = _make_proc(voiceprint=target, threshold=0.50)

    pushed: list = []
    await _drive(proc, _pcm_bytes(_speech(2.0, formant_shift=1.0, seed=2)), pushed)

    # Wait briefly for the embedding background task.
    await asyncio.sleep(0.5)

    tx = TranscriptionFrame("hello", "user", "2024-01-01T00:00:00Z", None)
    await proc.process_frame(tx, FrameDirection.DOWNSTREAM)

    assert "TranscriptionFrame" in pushed
    assert acc["count"] == 1
    assert rej["count"] == 0


@pytest.mark.asyncio
async def test_bystander_rejected():
    target = VoiceprintService.compute_embedding(_speech(4.0, formant_shift=1.0, seed=1), SR)
    proc, rej, acc = _make_proc(voiceprint=target, threshold=0.70)

    pushed: list = []
    # Different formant => different speaker
    await _drive(proc, _pcm_bytes(_speech(2.0, formant_shift=1.7, seed=99)), pushed)
    await asyncio.sleep(0.5)

    tx = TranscriptionFrame("hello", "user", "2024-01-01T00:00:00Z", None)
    await proc.process_frame(tx, FrameDirection.DOWNSTREAM)

    assert "TranscriptionFrame" not in pushed  # silently dropped
    assert rej["count"] == 1
    assert acc["count"] == 0


@pytest.mark.asyncio
async def test_short_segment_strict_drops():
    target = VoiceprintService.compute_embedding(_speech(4.0, seed=1), SR)
    proc, rej, acc = _make_proc(voiceprint=target, threshold=0.50, lenient=False)

    pushed: list = []
    # 0.3 s — below min_audio_secs=1.0 → strict drop without embedding
    await _drive(proc, _pcm_bytes(_speech(0.3, seed=2)), pushed)
    await asyncio.sleep(0.05)

    tx = TranscriptionFrame("hi", "user", "2024-01-01T00:00:00Z", None)
    await proc.process_frame(tx, FrameDirection.DOWNSTREAM)

    assert "TranscriptionFrame" not in pushed
    assert rej["count"] == 1
    assert acc["count"] == 0


@pytest.mark.asyncio
async def test_short_segment_lenient_runs_embedding():
    target = VoiceprintService.compute_embedding(_speech(4.0, seed=1), SR)
    proc, rej, acc = _make_proc(voiceprint=target, threshold=0.0, lenient=True)

    pushed: list = []
    await _drive(proc, _pcm_bytes(_speech(0.5, seed=2)), pushed)
    await asyncio.sleep(0.5)

    tx = TranscriptionFrame("yeah", "user", "2024-01-01T00:00:00Z", None)
    await proc.process_frame(tx, FrameDirection.DOWNSTREAM)

    assert "TranscriptionFrame" in pushed
    assert acc["count"] == 1


@pytest.mark.asyncio
async def test_no_decision_within_deadline_drops():
    target = VoiceprintService.compute_embedding(_speech(4.0, seed=1), SR)
    proc, rej, acc = _make_proc(voiceprint=target, threshold=0.50)
    proc._deadline_ms = 50  # very short

    pushed: list = []
    proc.push_frame = lambda frame, direction=FrameDirection.DOWNSTREAM: _collect(  # type: ignore[assignment]
        pushed, frame, direction
    )
    await proc.queue_frame(StartFrame(audio_in_sample_rate=SR), FrameDirection.DOWNSTREAM)

    # No prior speech segment → no embedding kicked → no decision
    tx = TranscriptionFrame("orphan", "user", "2024-01-01T00:00:00Z", None)
    await proc.process_frame(tx, FrameDirection.DOWNSTREAM)

    assert "TranscriptionFrame" not in pushed
    assert rej["count"] == 1
