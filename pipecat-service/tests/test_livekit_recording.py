import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.api import EgressStatus

# Ensure settings have basic values at import time.
os.environ.setdefault("LIVEKIT_URL", "wss://test.livekit.cloud")
os.environ.setdefault("LIVEKIT_API_KEY", "test-key")
os.environ.setdefault("LIVEKIT_API_SECRET", "test-secret")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role")
os.environ.setdefault("RECORDING_ENABLED", "true")
os.environ.setdefault("RECORDING_BUCKET", "session-recordings")
os.environ.setdefault("LIVEKIT_EGRESS_S3_ACCESS_KEY", "access")
os.environ.setdefault("LIVEKIT_EGRESS_S3_SECRET_KEY", "secret")
os.environ.setdefault("LIVEKIT_EGRESS_S3_ENDPOINT", "https://example.local")
os.environ.setdefault("LIVEKIT_EGRESS_S3_BUCKET", "session-recordings")

from app.services.livekit_service import LiveKitService


@pytest.fixture
def service_with_mocks():
    with patch("app.services.supabase_service.create_client"):
        service = LiveKitService()

    supabase_mock = MagicMock()
    supabase_mock.upsert_session_recording = AsyncMock()
    supabase_mock.update_session_recording_status = AsyncMock()
    supabase_mock.mark_session_recording_ready = AsyncMock()
    supabase_mock.mark_session_recording_failed = AsyncMock()
    service._supabase_service = supabase_mock

    return service, supabase_mock


@pytest.mark.asyncio
async def test_start_recording_persists_row_and_tracks_egress(service_with_mocks):
    service, supabase_mock = service_with_mocks
    api = MagicMock()
    api.egress.start_room_composite_egress = AsyncMock(
        return_value=SimpleNamespace(egress_id="eg-123")
    )
    api.aclose = AsyncMock()

    with patch.object(service, "_recording_enabled", return_value=True), patch.object(
        service, "_create_livekit_api", return_value=api
    ):
        await service._start_recording("session-1", "room-1", "user-1")

    assert service._session_recording_egress["session-1"] == "eg-123"
    supabase_mock.upsert_session_recording.assert_called_once()
    payload = supabase_mock.upsert_session_recording.call_args.args[1]
    assert payload["status"] == "recording"
    assert payload["provider"] == "livekit"
    assert payload["storage_path"].startswith("user-1/session-1/")


@pytest.mark.asyncio
async def test_start_recording_failure_is_non_fatal(service_with_mocks):
    service, supabase_mock = service_with_mocks
    api = MagicMock()
    api.egress.start_room_composite_egress = AsyncMock(side_effect=RuntimeError("egress down"))
    api.aclose = AsyncMock()

    with patch.object(service, "_recording_enabled", return_value=True), patch.object(
        service, "_create_livekit_api", return_value=api
    ):
        await service._start_recording("session-2", "room-2", "user-2")

    supabase_mock.mark_session_recording_failed.assert_called_once()


@pytest.mark.asyncio
async def test_finalize_recording_marks_ready_on_complete(service_with_mocks):
    service, supabase_mock = service_with_mocks
    service._session_recording_egress["session-3"] = "eg-300"

    info = SimpleNamespace(
        status=EgressStatus.EGRESS_COMPLETE,
        file_results=[SimpleNamespace(duration=120000, location="s3://bucket/file.mp3")],
        error="",
    )
    api = MagicMock()
    api.egress.stop_egress = AsyncMock(return_value=None)
    api.egress.list_egress = AsyncMock(return_value=SimpleNamespace(items=[info]))
    api.aclose = AsyncMock()

    with patch.object(service, "_create_livekit_api", return_value=api):
        await service._finalize_recording("session-3", stop_first=True)

    supabase_mock.update_session_recording_status.assert_called_once()
    supabase_mock.mark_session_recording_ready.assert_called_once()
    call_kwargs = supabase_mock.mark_session_recording_ready.call_args.kwargs
    assert call_kwargs["session_id"] == "session-3"
    assert call_kwargs["provider_recording_id"] == "eg-300"
    assert call_kwargs["duration_seconds"] == 120


@pytest.mark.asyncio
async def test_finalize_recording_marks_failed_on_error(service_with_mocks):
    service, supabase_mock = service_with_mocks
    service._session_recording_egress["session-4"] = "eg-400"

    info = SimpleNamespace(
        status=EgressStatus.EGRESS_FAILED,
        file_results=[],
        error="processing failed",
    )
    api = MagicMock()
    api.egress.stop_egress = AsyncMock(return_value=None)
    api.egress.list_egress = AsyncMock(return_value=SimpleNamespace(items=[info]))
    api.aclose = AsyncMock()

    with patch.object(service, "_create_livekit_api", return_value=api):
        await service._finalize_recording("session-4", stop_first=True)

    supabase_mock.mark_session_recording_failed.assert_called_once()
    call_kwargs = supabase_mock.mark_session_recording_failed.call_args.kwargs
    assert call_kwargs["session_id"] == "session-4"
    assert call_kwargs["provider_recording_id"] == "eg-400"
