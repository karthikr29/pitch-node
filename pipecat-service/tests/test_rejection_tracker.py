"""Unit tests for RejectionTracker."""

from __future__ import annotations

import asyncio

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.pipelines.processors.rejection_tracker import RejectionTracker


class FakeMonotonic:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


@pytest.fixture(autouse=True)
def freeze_time(monkeypatch):
    fake = FakeMonotonic()
    monkeypatch.setattr(
        "app.pipelines.processors.rejection_tracker.time.monotonic", fake
    )
    return fake


def _make_tracker(**kwargs):
    on_auto_end = MagicMock()
    pipeline_task = MagicMock()
    pipeline_task.queue_frames = AsyncMock()
    tracker = RejectionTracker(
        session_id="s1",
        on_auto_end=on_auto_end,
        cue_threshold_secs=12.0,
        auto_end_threshold_secs=32.0,
        **kwargs,
    )
    tracker.set_pipeline_task(pipeline_task)
    return tracker, on_auto_end, pipeline_task


def test_no_rejection_no_cue(freeze_time):
    tracker, on_auto_end, _ = _make_tracker()
    freeze_time.t = 100
    assert on_auto_end.called is False


@pytest.mark.asyncio
async def test_cue_fires_at_threshold(freeze_time):
    tracker, on_auto_end, task = _make_tracker()
    freeze_time.t = 0.0
    tracker.mark_rejected()
    freeze_time.t = 5.0
    tracker.mark_rejected()
    assert task.queue_frames.called is False
    freeze_time.t = 13.0
    tracker.mark_rejected()
    # Yield so the create_task coroutine actually runs.
    await asyncio.sleep(0)
    assert tracker._cue_spoken is True
    assert task.queue_frames.called is True
    assert on_auto_end.called is False


def test_auto_end_fires_after_window(freeze_time):
    tracker, on_auto_end, _ = _make_tracker()
    freeze_time.t = 0.0
    tracker.mark_rejected()
    freeze_time.t = 33.0
    tracker.mark_rejected()
    on_auto_end.assert_called_once()
    args, _ = on_auto_end.call_args
    assert args[0]["reasonCode"] == "noisy_environment"


def test_accept_resets_counter(freeze_time):
    tracker, on_auto_end, _ = _make_tracker()
    freeze_time.t = 0.0
    tracker.mark_rejected()
    freeze_time.t = 11.0
    tracker.mark_accepted()
    # Now another rejection at t=12 should NOT trigger cue (timer just started).
    freeze_time.t = 12.0
    tracker.mark_rejected()
    assert tracker._cue_spoken is False


def test_disabled_tracker_noops(freeze_time):
    tracker, on_auto_end, _ = _make_tracker(enabled=False)
    freeze_time.t = 0.0
    tracker.mark_rejected()
    freeze_time.t = 100.0
    tracker.mark_rejected()
    assert on_auto_end.called is False
    assert tracker._cue_spoken is False


def test_auto_end_only_fires_once(freeze_time):
    tracker, on_auto_end, _ = _make_tracker()
    freeze_time.t = 0.0
    tracker.mark_rejected()
    freeze_time.t = 33.0
    tracker.mark_rejected()
    freeze_time.t = 40.0
    tracker.mark_rejected()
    assert on_auto_end.call_count == 1


def test_invalid_thresholds_rejected():
    with pytest.raises(ValueError):
        RejectionTracker(
            session_id="s1",
            on_auto_end=lambda r: None,
            cue_threshold_secs=20.0,
            auto_end_threshold_secs=10.0,
        )
