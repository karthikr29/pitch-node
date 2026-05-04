"""
Silero VAD whose ``stop_secs`` can be retuned per frame without state loss.

Why a subclass: pipecat 0.0.104's ``VADAnalyzer.set_params()`` caches
``stop_secs`` into ``_vad_stop_frames`` and resets the VAD state machine. We
need to change ``stop_secs`` per audio frame (driven by an ambient-noise
estimator) without dropping a partial speech segment, so this subclass
overrides ``_run_analyzer`` and surgically updates ``_vad_stop_frames`` only
when the target value actually changes.
"""

from __future__ import annotations

from typing import Callable, Optional

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams, VADState


class AdaptiveSileroVAD(SileroVADAnalyzer):
    """SileroVADAnalyzer with a runtime-mutable ``stop_secs``.

    Pass ``get_stop_secs`` as a callable that returns the desired silence
    window (in seconds) at any moment. The override re-evaluates the callable
    on each VAD frame and updates the cached frame count when (and only when)
    the target value changes by more than 1 us.
    """

    def __init__(
        self,
        *,
        get_stop_secs: Callable[[], float],
        sample_rate: Optional[int] = None,
        params: Optional[VADParams] = None,
    ):
        super().__init__(sample_rate=sample_rate, params=params)
        self._get_stop_secs = get_stop_secs
        self._current_stop_secs = self._params.stop_secs

    def _maybe_retune(self) -> None:
        target = float(self._get_stop_secs())
        if abs(target - self._current_stop_secs) <= 1e-6:
            return
        if self._sample_rate <= 0 or self._vad_frames <= 0:
            # Not started yet; just record the desired value for later.
            self._params.stop_secs = target
            self._current_stop_secs = target
            return
        vad_frames_per_sec = self._vad_frames / self._sample_rate
        new_stop_frames = round(target / vad_frames_per_sec)
        # Mutate the cache directly. Do NOT call set_params() — that resets
        # _vad_state / _vad_starting_count / _vad_stopping_count, which would
        # corrupt an in-progress speech segment.
        self._params.stop_secs = target
        self._vad_stop_frames = new_stop_frames
        self._current_stop_secs = target

    def _run_analyzer(self, buffer: bytes) -> VADState:  # type: ignore[override]
        self._maybe_retune()
        return super()._run_analyzer(buffer)
