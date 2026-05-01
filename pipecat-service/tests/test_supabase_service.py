from unittest.mock import MagicMock

import pytest

from app.services.supabase_service import SupabaseService


@pytest.mark.asyncio
async def test_complete_session_uses_credit_charging_rpc():
    service = SupabaseService.__new__(SupabaseService)
    execute = MagicMock(
        return_value=MagicMock(
            data=[
                {
                    "duration_seconds": 11,
                    "credits_charged_seconds": 11,
                    "already_charged": False,
                }
            ]
        )
    )
    rpc = MagicMock(return_value=MagicMock(execute=execute))
    service.client = MagicMock(rpc=rpc)

    await service.complete_session("session-1")

    rpc.assert_called_once()
    name, payload = rpc.call_args.args
    assert name == "complete_session_with_credits"
    assert payload["p_session_id"] == "session-1"
    assert payload["p_ended_at"]
    execute.assert_called_once()
