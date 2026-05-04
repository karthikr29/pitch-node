"""Unit tests for AdaptiveSileroVAD: surgical retune without state reset."""

from __future__ import annotations

import pytest
from pipecat.audio.vad.vad_analyzer import VADParams

from app.pipelines.processors.adaptive_vad import AdaptiveSileroVAD


@pytest.fixture
def vad():
    target = {"val": 0.2}
    inst = AdaptiveSileroVAD(
        get_stop_secs=lambda: target["val"],
        sample_rate=16000,
        params=VADParams(confidence=0.85, start_secs=0.3, stop_secs=0.2, min_volume=0.7),
    )
    inst.set_sample_rate(16000)
    inst._target_ref = target  # type: ignore[attr-defined]
    return inst


def test_initial_stop_frames(vad):
    assert vad._params.stop_secs == 0.2
    initial = vad._vad_stop_frames
    assert initial > 0


def test_retune_doubles_stop_frames(vad):
    initial = vad._vad_stop_frames
    vad._target_ref["val"] = 0.4
    vad._maybe_retune()
    assert vad._params.stop_secs == 0.4
    assert vad._vad_stop_frames == pytest.approx(initial * 2, abs=1)


def test_retune_no_op_when_unchanged(vad):
    initial = vad._vad_stop_frames
    vad._maybe_retune()
    vad._maybe_retune()
    assert vad._vad_stop_frames == initial


def test_retune_preserves_state(vad):
    """Mid-segment retune must NOT reset internal counters (no set_params call)."""
    vad._vad_stopping_count = 7
    vad._vad_starting_count = 3
    vad._target_ref["val"] = 0.4
    vad._maybe_retune()
    assert vad._vad_stopping_count == 7
    assert vad._vad_starting_count == 3


def test_retune_back_and_forth(vad):
    vad._target_ref["val"] = 0.4
    vad._maybe_retune()
    after_noisy = vad._vad_stop_frames
    vad._target_ref["val"] = 0.2
    vad._maybe_retune()
    assert vad._params.stop_secs == 0.2
    assert vad._vad_stop_frames == pytest.approx(after_noisy / 2, abs=1)
