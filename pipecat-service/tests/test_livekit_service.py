import asyncio
from unittest.mock import AsyncMock

import numpy as np
import pytest

from app.services.livekit_service import LiveKitService
from app.services.voiceprint_service import VoiceprintService


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


def test_set_voiceprint_decodes_and_stores():
    service = LiveKitService()
    emb = np.random.randn(256).astype(np.float32)
    emb /= np.linalg.norm(emb)
    b64 = VoiceprintService.encode(emb)
    decoded = service.set_voiceprint("sess", b64)
    assert decoded is not None
    assert np.allclose(service.get_voiceprint("sess"), emb)


def test_set_voiceprint_none_returns_none():
    service = LiveKitService()
    assert service.set_voiceprint("sess", None) is None
    assert service.get_voiceprint("sess") is None


def test_set_voiceprint_invalid_base64_returns_none():
    service = LiveKitService()
    assert service.set_voiceprint("sess", "!!!notb64!!!") is None
    assert service.get_voiceprint("sess") is None


@pytest.mark.asyncio
async def test_drop_voiceprint_runs_in_finalize_path():
    service = LiveKitService()
    emb = np.random.randn(256).astype(np.float32)
    emb /= np.linalg.norm(emb)
    service.set_voiceprint("vp1", VoiceprintService.encode(emb))
    assert service.get_voiceprint("vp1") is not None

    service._delete_room_for_session = AsyncMock()
    service._supabase_service.complete_session = AsyncMock()
    await service._finalize_auto_completed_session("vp1", {"type": "auto_end"})
    assert service.get_voiceprint("vp1") is None


@pytest.mark.asyncio
async def test_drop_voiceprint_runs_in_stop_pipeline():
    service = LiveKitService()
    emb = np.random.randn(256).astype(np.float32)
    emb /= np.linalg.norm(emb)
    service.set_voiceprint("vp2", VoiceprintService.encode(emb))
    service._delete_room_for_session = AsyncMock()
    await service.stop_pipeline("vp2")
    assert service.get_voiceprint("vp2") is None


@pytest.mark.asyncio
async def test_drop_voiceprint_runs_in_pipeline_task_failure():
    service = LiveKitService()
    emb = np.random.randn(256).astype(np.float32)
    emb /= np.linalg.norm(emb)
    service.set_voiceprint("vp3", VoiceprintService.encode(emb))

    fut = asyncio.get_running_loop().create_future()
    fut.set_exception(RuntimeError("boom"))
    service._active_pipelines["vp3"] = fut
    service._cancel_auto_end_fallback = AsyncMock()
    service._cancel_time_limit = AsyncMock()
    service._delete_room_for_session = AsyncMock()
    await service._handle_pipeline_task_done("vp3", fut)
    assert service.get_voiceprint("vp3") is None


@pytest.mark.asyncio
async def test_connected_time_limit_starts_after_connected_signal(monkeypatch):
    service = LiveKitService()
    order: list[str] = []

    async def delete_room(session_id: str):
        order.append("delete")

    async def complete_session(session_id: str):
        order.append("complete")

    service._delete_room_for_session = AsyncMock(side_effect=delete_room)
    service._supabase_service.complete_session = AsyncMock(side_effect=complete_session)
    monkeypatch.setattr("app.services.livekit_service.AUTO_END_FALLBACK_SECS", 0)

    service.schedule_connected_time_limit("session-4", 0.001)

    await asyncio.sleep(0.01)
    await asyncio.sleep(0)

    assert order == ["delete", "complete"]
    state = service.get_session_state("session-4")
    assert state["phase"] == "ended"
    assert state["endReason"] == {"type": "time_limit", "max_seconds": 0.001}
