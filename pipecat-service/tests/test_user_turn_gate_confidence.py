"""Unit tests for the STT confidence gate inside UserTurnGateProcessor."""

from __future__ import annotations

import asyncio

import pytest
from types import SimpleNamespace

from pipecat.frames.frames import TranscriptionFrame
from pipecat.processors.frame_processor import FrameDirection

from app.pipelines.sales_pipeline import UserTurnGateProcessor


def _frame_with_result(text: str, result):
    return TranscriptionFrame(
        text=text,
        user_id="u",
        timestamp="2024-01-01T00:00:00Z",
        language=None,
        result=result,
        finalized=True,
    )


def test_extract_confidence_flux_top_level():
    f = _frame_with_result("hi", {"turn": {"confidence": 0.83}})
    assert UserTurnGateProcessor._extract_confidence(f) == pytest.approx(0.83)


def test_extract_confidence_flux_words_average():
    f = _frame_with_result(
        "hi",
        {
            "turn": {
                "words": [
                    {"confidence": 0.8},
                    {"confidence": 0.9},
                    {"confidence": 0.7},
                ]
            }
        },
    )
    avg = UserTurnGateProcessor._extract_confidence(f)
    assert avg == pytest.approx((0.8 + 0.9 + 0.7) / 3)


def test_extract_confidence_non_flux_object():
    alt = SimpleNamespace(confidence=0.42, words=[])
    channel = SimpleNamespace(alternatives=[alt])
    result = SimpleNamespace(channel=channel)
    f = _frame_with_result("hi", result)
    assert UserTurnGateProcessor._extract_confidence(f) == pytest.approx(0.42)


def test_extract_confidence_missing_returns_none():
    f = _frame_with_result("hi", None)
    assert UserTurnGateProcessor._extract_confidence(f) is None


def test_passes_gate_when_threshold_zero():
    g = UserTurnGateProcessor(
        session_id="s",
        on_auto_end=lambda r: None,
        min_avg_word_confidence=0.0,
    )
    f = _frame_with_result("hi", {"turn": {"confidence": 0.05}})
    assert g._passes_confidence_gate(f) is True


def test_passes_gate_when_above_threshold():
    g = UserTurnGateProcessor(
        session_id="s",
        on_auto_end=lambda r: None,
        min_avg_word_confidence=0.55,
    )
    f = _frame_with_result("hi", {"turn": {"confidence": 0.7}})
    assert g._passes_confidence_gate(f) is True


def test_fails_gate_below_threshold():
    g = UserTurnGateProcessor(
        session_id="s",
        on_auto_end=lambda r: None,
        min_avg_word_confidence=0.55,
    )
    f = _frame_with_result("hi", {"turn": {"confidence": 0.3}})
    assert g._passes_confidence_gate(f) is False


def test_passes_when_confidence_unavailable():
    g = UserTurnGateProcessor(
        session_id="s",
        on_auto_end=lambda r: None,
        min_avg_word_confidence=0.55,
    )
    f = _frame_with_result("hi", None)
    assert g._passes_confidence_gate(f) is True


@pytest.mark.asyncio
async def test_low_confidence_increments_drop_count_and_calls_on_rejection():
    rejected = {"count": 0}

    g = UserTurnGateProcessor(
        session_id="s",
        on_auto_end=lambda r: None,
        min_avg_word_confidence=0.55,
        on_rejection=lambda: rejected.update(count=rejected["count"] + 1),
    )
    pushed: list = []

    async def collect(frame, direction=FrameDirection.DOWNSTREAM):
        pushed.append(type(frame).__name__)

    g.push_frame = collect  # type: ignore[assignment]

    f = _frame_with_result("low confidence text", {"turn": {"confidence": 0.1}})
    await g.process_frame(f, FrameDirection.DOWNSTREAM)
    assert g.confidence_drop_count == 1
    assert rejected["count"] == 1
    assert "TranscriptionFrame" not in pushed
