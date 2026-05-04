"""
Post-STT speaker verification.

Sits between the STT service and ``UserTurnGateProcessor``. Buffers raw audio
during a VAD-detected speech segment; when the user stops speaking, kicks a
background task that computes a Resemblyzer embedding and a cosine similarity
against the enrolled voiceprint. When the STT then emits a final
``TranscriptionFrame`` for the same segment, the decision is read out (with
a short bounded wait if STT happens to beat embedding) and either passes the
transcript downstream or silently drops it.

Latency: the embedding runs in parallel with STT, so the post-VAD critical
path adds only the time to read a cached decision (microseconds in the
common case). The bounded ``decision_deadline_ms`` only applies when STT
returns the final transcript before the embedding finishes — typically just
a few tens of ms.

When the enrolled voiceprint is ``None`` (user opted out of voice ID), the
processor passes everything through and never marks rejections.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

import numpy as np
from loguru import logger
from pipecat.frames.frames import (
    AudioRawFrame,
    EndFrame,
    Frame,
    InterruptionFrame,
    TranscriptionFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
    VADUserStartedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from app.services.voiceprint_service import VoiceprintService


# Cap the in-memory audio buffer at ~3 s to bound memory and keep the
# embedding fast even on unusually long utterances.
_MAX_BUFFER_BYTES = 3 * 16000 * 2


@dataclass
class VerificationDecision:
    accepted: bool
    similarity: Optional[float]
    seg_secs: float
    at: float  # time.monotonic()
    reason: str  # threshold | short_segment_strict | embed_error | no_decision


class SpeakerVerificationProcessor(FrameProcessor):
    def __init__(
        self,
        *,
        session_id: str,
        voiceprint: Optional[np.ndarray],
        similarity_threshold: float,
        verification_window_ms: int,
        min_audio_secs: float,
        lenient_short_segments: bool,
        decision_deadline_ms: int,
        on_rejection: Callable[[], None],
        on_acceptance: Optional[Callable[[], None]] = None,
    ):
        super().__init__()
        self._session_id = session_id
        self._enrolled = voiceprint
        self._threshold = float(similarity_threshold)
        self._window_ms = int(verification_window_ms)
        self._min_audio_secs = float(min_audio_secs)
        self._lenient = bool(lenient_short_segments)
        self._deadline_ms = int(decision_deadline_ms)
        self._on_rejection = on_rejection
        self._on_acceptance = on_acceptance

        self._user_speaking = False
        self._buf = bytearray()
        self._sample_rate = 16000
        self._last_decision: Optional[VerificationDecision] = None
        self._embedding_task: Optional[asyncio.Task] = None

        # Telemetry counters.
        self.accept_count = 0
        self.reject_count = 0

    # ------------------------------------------------------------------
    # Frame handling
    # ------------------------------------------------------------------

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if self._enrolled is None:
            # Skip mode: pass everything through, never mark rejections.
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, (VADUserStartedSpeakingFrame, UserStartedSpeakingFrame)):
            self._user_speaking = True
            self._buf.clear()
            self._last_decision = None
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, (VADUserStoppedSpeakingFrame, UserStoppedSpeakingFrame)):
            self._user_speaking = False
            self._kick_final_embedding()
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, AudioRawFrame):
            if self._user_speaking:
                self._sample_rate = frame.sample_rate or self._sample_rate
                # Append, capped at MAX_BUFFER_BYTES (drop oldest bytes).
                self._buf.extend(frame.audio)
                if len(self._buf) > _MAX_BUFFER_BYTES:
                    overflow = len(self._buf) - _MAX_BUFFER_BYTES
                    del self._buf[:overflow]
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, TranscriptionFrame):
            decision = await self._await_decision()
            if decision is not None and decision.accepted:
                self.accept_count += 1
                self._log_decision(decision)
                if self._on_acceptance is not None:
                    self._on_acceptance()
                await self.push_frame(frame, direction)
                return
            self.reject_count += 1
            if decision is None:
                decision = VerificationDecision(
                    accepted=False,
                    similarity=None,
                    seg_secs=0.0,
                    at=time.monotonic(),
                    reason="no_decision",
                )
            self._log_decision(decision)
            self._on_rejection()
            return  # silent drop

        # Pipeline-control frames must always pass through, otherwise the
        # downstream ``turn_gate`` and ``llm`` will hang on shutdown / reset.
        await self.push_frame(frame, direction)

        # Reset buffer state on EndFrame / InterruptionFrame so a stale
        # segment doesn't leak into the next session reuse.
        if isinstance(frame, (EndFrame, InterruptionFrame)):
            self._user_speaking = False
            self._buf.clear()
            self._last_decision = None

    # ------------------------------------------------------------------
    # Embedding kickoff & decision plumbing
    # ------------------------------------------------------------------

    def _kick_final_embedding(self) -> None:
        bytes_per_sec = max(1, self._sample_rate * 2)
        seg_secs = len(self._buf) / bytes_per_sec
        if seg_secs <= 0:
            return
        if seg_secs < self._min_audio_secs and not self._lenient:
            self._last_decision = VerificationDecision(
                accepted=False,
                similarity=None,
                seg_secs=seg_secs,
                at=time.monotonic(),
                reason="short_segment_strict",
            )
            return
        audio = bytes(self._buf)
        sr = self._sample_rate
        self._embedding_task = asyncio.create_task(self._compute(audio, sr, seg_secs))

    async def _compute(self, audio_bytes: bytes, sample_rate: int, seg_secs: float) -> None:
        try:
            pcm = (
                np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            )
            emb = await asyncio.to_thread(
                VoiceprintService.compute_embedding, pcm, sample_rate
            )
            sim = VoiceprintService.cosine(emb, self._enrolled)
            self._last_decision = VerificationDecision(
                accepted=sim >= self._threshold,
                similarity=sim,
                seg_secs=seg_secs,
                at=time.monotonic(),
                reason="threshold",
            )
        except Exception as e:  # pragma: no cover - defensive
            logger.warning(
                "speaker_verification: embedding error session={} err={}",
                self._session_id,
                e,
            )
            self._last_decision = VerificationDecision(
                accepted=False,
                similarity=None,
                seg_secs=seg_secs,
                at=time.monotonic(),
                reason="embed_error",
            )

    async def _await_decision(self) -> Optional[VerificationDecision]:
        deadline = time.monotonic() + (self._deadline_ms / 1000.0)
        window = self._window_ms / 1000.0
        while True:
            d = self._last_decision
            if d is not None and (time.monotonic() - d.at) <= window:
                return d
            if time.monotonic() >= deadline:
                # Final read after the deadline so a near-simultaneous
                # arrival isn't lost.
                d = self._last_decision
                if d is not None and (time.monotonic() - d.at) <= window:
                    return d
                return None
            await asyncio.sleep(0.025)

    def _log_decision(self, d: VerificationDecision) -> None:
        sim_str = f"{d.similarity:.4f}" if d.similarity is not None else "None"
        logger.info(
            "speaker_verification: session={} accepted={} similarity={} seg_secs={:.2f} reason={}",
            self._session_id,
            d.accepted,
            sim_str,
            d.seg_secs,
            d.reason,
        )
