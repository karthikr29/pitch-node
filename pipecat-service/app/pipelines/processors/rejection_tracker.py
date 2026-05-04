"""
Tracks consecutive seconds of rejected user audio and triggers (a) a one-shot
AI cue at ``cue_threshold_secs`` and (b) an auto-end at
``auto_end_threshold_secs``.

A "rejection" is an event recorded by an upstream gate — the speaker
verifier dropping a transcript on similarity mismatch, or the STT confidence
gate dropping a low-confidence transcript. Long user pauses are NOT counted:
silence does not produce a rejection event.

The tracker is reset (``mark_accepted``) whenever a transcript is
successfully pushed downstream by ``UserTurnGateProcessor``.

It is constructed without a pipeline task so that the call site can wire it
in late (the task only exists after ``Pipeline([...])`` is built and a
``PipelineTask`` is created around it).
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Callable

from loguru import logger
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.task import PipelineTask


DEFAULT_CUE_TEXT = (
    "Sorry, I'm having trouble hearing you — could you move somewhere quieter?"
)


class RejectionTracker:
    def __init__(
        self,
        *,
        session_id: str,
        on_auto_end: Callable[[dict[str, Any]], None],
        cue_threshold_secs: float = 12.0,
        auto_end_threshold_secs: float = 32.0,
        cue_text: str = DEFAULT_CUE_TEXT,
        enabled: bool = True,
    ):
        if auto_end_threshold_secs <= cue_threshold_secs:
            raise ValueError(
                "auto_end_threshold_secs must be > cue_threshold_secs"
            )
        self._session_id = session_id
        self._on_auto_end = on_auto_end
        self._cue_threshold = float(cue_threshold_secs)
        self._auto_end_threshold = float(auto_end_threshold_secs)
        self._cue_text = cue_text
        self._enabled = bool(enabled)
        self._task: PipelineTask | None = None
        self._first_rejection_at: float | None = None
        self._cue_spoken = False
        self._auto_end_fired = False

    @property
    def enabled(self) -> bool:
        return self._enabled

    def set_enabled(self, value: bool) -> None:
        self._enabled = bool(value)
        if not value:
            self.mark_accepted()

    def set_pipeline_task(self, task: PipelineTask) -> None:
        self._task = task

    def mark_accepted(self) -> None:
        self._first_rejection_at = None
        self._cue_spoken = False
        # Don't reset _auto_end_fired — once fired, it shouldn't re-fire
        # for the rest of the session.

    def mark_rejected(self) -> None:
        if not self._enabled or self._auto_end_fired:
            return
        now = time.monotonic()
        if self._first_rejection_at is None:
            self._first_rejection_at = now
        elapsed = now - self._first_rejection_at

        if elapsed >= self._auto_end_threshold:
            self._auto_end_fired = True
            logger.info(
                "rejection_tracker: auto-ending session={} after {:.1f}s of rejection",
                self._session_id,
                elapsed,
            )
            self._on_auto_end(
                {
                    "type": "auto_end",
                    "speaker": "system",
                    "reasonCode": "noisy_environment",
                    "trigger": "sustained_rejection",
                }
            )
            return

        if elapsed >= self._cue_threshold and not self._cue_spoken:
            self._cue_spoken = True
            logger.info(
                "rejection_tracker: speaking cue session={} after {:.1f}s",
                self._session_id,
                elapsed,
            )
            if self._task is None:
                logger.error(
                    "rejection_tracker: no pipeline task set, cannot speak cue session={}",
                    self._session_id,
                )
                return
            asyncio.create_task(
                self._task.queue_frames([TTSSpeakFrame(text=self._cue_text)])
            )
