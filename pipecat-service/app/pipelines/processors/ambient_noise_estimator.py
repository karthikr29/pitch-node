"""
Rolling 1-second RMS estimator over the user's input audio stream.

Drives the adaptive VAD: when sustained ambient RMS is above the configured
threshold, callers tighten ``stop_secs`` to keep fan/HVAC noise from
re-triggering speech-start; otherwise they keep the quiet-mode latency.

This processor is a passthrough — it never drops or rewrites frames, only
inspects ``InputAudioRawFrame`` instances to update its rolling window.
"""

from __future__ import annotations

import time
from collections import deque
from typing import Deque, Tuple

import numpy as np
from pipecat.frames.frames import Frame, InputAudioRawFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor


class AmbientNoiseEstimator(FrameProcessor):
    """Tracks rolling 1-second average RMS; exposes ``is_noisy()``.

    The threshold is the average normalised RMS [0..1] above which the room is
    considered noisy. ``noisy_mode_active_secs`` is exposed so the pipeline can
    log how long the adaptive VAD spent in tightened mode.
    """

    def __init__(self, *, threshold_rms: float, window_secs: float = 1.0):
        super().__init__()
        self._threshold = float(threshold_rms)
        self._window_secs = float(window_secs)
        self._window: Deque[Tuple[float, float, float]] = deque()
        # Each entry: (timestamp, sample_seconds_in_frame, rms)
        self._noisy = False
        self._last_noisy_at: float | None = None
        self._noisy_active_secs = 0.0

    def is_noisy(self) -> bool:
        return self._noisy

    @property
    def noisy_mode_active_secs(self) -> float:
        """Cumulative wall time the estimator reported noisy mode."""
        # Snapshot includes any in-progress noisy interval.
        if self._noisy and self._last_noisy_at is not None:
            return self._noisy_active_secs + (time.monotonic() - self._last_noisy_at)
        return self._noisy_active_secs

    @staticmethod
    def _frame_rms(frame: InputAudioRawFrame) -> Tuple[float, float]:
        """Return (frame_seconds, normalised RMS in [0, 1])."""
        sample_rate = frame.sample_rate or 16000
        channels = frame.num_channels or 1
        bytes_per_sample = 2  # PCM16
        if not frame.audio:
            return 0.0, 0.0
        samples = np.frombuffer(frame.audio, dtype=np.int16)
        if samples.size == 0:
            return 0.0, 0.0
        seconds = samples.size / (sample_rate * channels)
        rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2))) / 32768.0
        return seconds, rms

    def _maybe_transition(self, new_state: bool) -> None:
        if new_state == self._noisy:
            return
        now = time.monotonic()
        if new_state:
            self._last_noisy_at = now
        else:
            if self._last_noisy_at is not None:
                self._noisy_active_secs += now - self._last_noisy_at
                self._last_noisy_at = None
        self._noisy = new_state

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, InputAudioRawFrame):
            seconds, rms = self._frame_rms(frame)
            if seconds > 0:
                now = time.monotonic()
                self._window.append((now, seconds, rms))
                # Evict samples older than ``window_secs``.
                cutoff = now - self._window_secs
                while self._window and self._window[0][0] < cutoff:
                    self._window.popleft()

                total_secs = sum(secs for _, secs, _ in self._window)
                if total_secs > 0:
                    weighted = sum(secs * rms for _, secs, rms in self._window)
                    avg_rms = weighted / total_secs
                else:
                    avg_rms = 0.0
                self._maybe_transition(avg_rms >= self._threshold)

        await self.push_frame(frame, direction)
