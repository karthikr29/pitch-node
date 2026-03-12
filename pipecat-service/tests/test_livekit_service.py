import asyncio
from unittest.mock import AsyncMock

import pytest

from app.services.livekit_service import LiveKitService


@pytest.mark.asyncio
async def test_auto_end_fallback_sets_ending_state_and_finalizes(monkeypatch):
    service = LiveKitService()
    order: list[str] = []

    async def delete_room(session_id: str):
        order.append("delete")

    async def complete_session(session_id: str):
        order.append("complete")

    service._delete_room_for_session = AsyncMock(side_effect=delete_room)
    service._supabase_service.complete_session = AsyncMock(side_effect=complete_session)
    monkeypatch.setattr("app.services.livekit_service.AUTO_END_FALLBACK_SECS", 0)

    reason = {
        "type": "auto_end",
        "speaker": "user",
        "reasonCode": "closing_goodbye",
        "trigger": "transcription_frame",
    }
    service._schedule_auto_end_fallback("session-1", reason)

    assert service.get_session_state("session-1")["phase"] == "ending"
    await asyncio.sleep(0)
    await asyncio.sleep(0)

    assert order == ["delete", "complete"]
    assert service.get_session_state("session-1")["phase"] == "ended"
    assert service.get_session_state("session-1")["autoEndRequested"] is True


@pytest.mark.asyncio
async def test_finalize_auto_completed_session_is_idempotent():
    service = LiveKitService()
    order: list[str] = []

    async def delete_room(session_id: str):
        order.append("delete")

    async def complete_session(session_id: str):
        order.append("complete")

    service._delete_room_for_session = AsyncMock(side_effect=delete_room)
    service._supabase_service.complete_session = AsyncMock(side_effect=complete_session)

    reason = {
        "type": "auto_end",
        "speaker": "ai",
        "reasonCode": "closing_goodbye",
        "trigger": "ai_full_response_end",
    }

    await service._finalize_auto_completed_session("session-2", reason)
    await service._finalize_auto_completed_session("session-2", reason)

    assert order == ["delete", "complete"]
    assert service.get_session_state("session-2")["phase"] == "ended"


@pytest.mark.asyncio
async def test_handle_pipeline_task_done_cancels_fallback_and_finalizes_once():
    service = LiveKitService()
    session_id = "session-3"
    task = asyncio.get_running_loop().create_future()
    task.set_result(
        {
            "auto_complete_session": True,
            "end_reason": {
                "type": "auto_end",
                "speaker": "user",
                "reasonCode": "explicit_end_call",
                "trigger": "transcription_frame",
            },
        }
    )
    service._active_pipelines[session_id] = task
    service._cancel_auto_end_fallback = AsyncMock()
    service._finalize_auto_completed_session = AsyncMock()

    await service._handle_pipeline_task_done(session_id, task)

    service._cancel_auto_end_fallback.assert_awaited_once_with(session_id)
    service._finalize_auto_completed_session.assert_awaited_once()


def test_get_session_state_returns_unknown_when_untracked():
    service = LiveKitService()

    assert service.get_session_state("missing") == {
        "sessionId": "missing",
        "phase": "unknown",
        "autoEndRequested": False,
        "endReason": None,
        "requestedAt": None,
    }
