"""
API endpoint tests for the Pipecat voice pipeline service.

Tests cover:
- Health check endpoint
- Session start (with mocked LiveKit + Supabase)
- Session end
- API key authentication (valid + invalid)
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

# Set env vars before importing app (they're read at import time)
import os
os.environ.setdefault("LIVEKIT_URL", "wss://test.livekit.cloud")
os.environ.setdefault("LIVEKIT_API_KEY", "APItest123")
os.environ.setdefault("LIVEKIT_API_SECRET", "testsecret")
os.environ.setdefault("DEEPGRAM_API_KEY", "test-deepgram")
os.environ.setdefault("CARTESIA_API_KEY", "test-cartesia")
os.environ.setdefault("OPENROUTER_API_KEY", "test-openrouter")
os.environ.setdefault("XAI_API_KEY", "test-xai")
os.environ.setdefault("XAI_API_BASE_URL", "https://api.x.ai/v1")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.abc123")
os.environ.setdefault("PIPECAT_SERVICE_API_KEY", "test-api-key-123")

VALID_AUTH = "Bearer test-api-key-123"
INVALID_AUTH = "Bearer wrong-key"

MOCK_SCENARIO = {
    "id": "scenario-1",
    "title": "Test Scenario",
    "description": "A test scenario",
    "call_type": "discovery",
    "difficulty": "medium",
    "context_briefing": {"situation": "test", "company": "TestCo", "industry": "Tech", "budget": "$50k"},
    "objectives": ["Qualify the lead"],
    "evaluation_criteria": {},
}

MOCK_PERSONA = {
    "id": "persona-1",
    "name": "Test Persona",
    "title": "VP of Engineering",
    "description": "A skeptical buyer",
    "persona_type": "skeptical",
    "behavior_profile": {"communication_style": "direct", "decision_making": "analytical", "key_concerns": [], "pain_points": []},
    "difficulty_modifiers": {"medium": {"objection_frequency": "moderate", "engagement_level": "moderate", "decision_readiness": "moderate"}},
    "cartesia_voice_id": "voice-123",
    "emoji": "🤔",
}


@pytest.fixture
def mock_supabase():
    """Mock the Supabase client so tests don't need a real database."""
    with patch("app.services.supabase_service.create_client") as mock_create:
        mock_client = MagicMock()

        # Mock scenario query chain
        scenario_chain = MagicMock()
        scenario_chain.execute.return_value = MagicMock(data=MOCK_SCENARIO)
        mock_client.table.return_value.select.return_value.eq.return_value.single.return_value = scenario_chain

        mock_create.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_livekit():
    """Mock LiveKit API so tests don't need a real LiveKit server."""
    with patch("app.services.livekit_service.LiveKitAPI") as mock_api_cls, \
         patch("app.services.livekit_service.AccessToken") as mock_token_cls:

        # Mock room creation
        mock_api = MagicMock()
        mock_api.room.create_room = AsyncMock()
        mock_api.aclose = AsyncMock()
        mock_api_cls.return_value = mock_api

        # Mock token generation (builder pattern)
        mock_token = MagicMock()
        mock_token.with_identity.return_value = mock_token
        mock_token.with_name.return_value = mock_token
        mock_token.with_grants.return_value = mock_token
        mock_token.to_jwt.return_value = "mock-jwt-token-for-testing"
        mock_token_cls.return_value = mock_token

        yield {"api": mock_api, "token": mock_token}


@pytest.fixture
def client(mock_supabase, mock_livekit):
    """Create a test client with mocked dependencies.

    We need to re-import after mocking because the services are
    instantiated at module level.
    """
    # Patch at the routes module level where instances are created
    with patch.dict(
        os.environ,
        {
            "PIPECAT_SERVICE_API_KEY": "test-api-key-123",
            "XAI_API_KEY": "test-xai",
            "XAI_API_BASE_URL": "https://api.x.ai/v1",
        },
        clear=False,
    ), patch("app.api.routes.supabase_service") as mock_svc, \
         patch("app.api.routes.livekit_service") as mock_lk_svc:

        # Configure supabase service mocks
        mock_svc.get_scenario = AsyncMock(return_value=MOCK_SCENARIO)
        mock_svc.get_persona = AsyncMock(return_value=MOCK_PERSONA)

        # Configure livekit service mocks
        mock_lk_svc.create_room_and_token = AsyncMock(return_value="mock-jwt-token")
        mock_lk_svc.start_pipeline = AsyncMock()
        mock_lk_svc.stop_pipeline = AsyncMock()

        from app.main import app
        with TestClient(app) as test_client:
            yield test_client


# ──────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────

class TestHealthCheck:
    def test_health_returns_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_api_v1_health_returns_ok(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# ──────────────────────────────────────────────────────────
# Authentication
# ──────────────────────────────────────────────────────────

class TestAuthentication:
    def test_valid_api_key_is_accepted(self, client):
        response = client.post(
            "/api/v1/sessions/start",
            headers={"Authorization": VALID_AUTH},
            json={
                "session_id": "auth-test-1",
                "room_name": "auth-room-1",
                "scenario_id": "scenario-1",
                "persona_id": "persona-1",
                "user_id": "user-1",
            },
        )
        assert response.status_code == 200

    def test_invalid_api_key_is_rejected(self, client):
        response = client.post(
            "/api/v1/sessions/start",
            headers={"Authorization": INVALID_AUTH},
            json={
                "session_id": "auth-test-2",
                "room_name": "auth-room-2",
                "scenario_id": "scenario-1",
                "persona_id": "persona-1",
                "user_id": "user-1",
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid API key"

    def test_missing_api_key_is_rejected(self, client):
        response = client.post(
            "/api/v1/sessions/start",
            json={
                "session_id": "auth-test-3",
                "room_name": "auth-room-3",
                "scenario_id": "scenario-1",
                "persona_id": "persona-1",
                "user_id": "user-1",
            },
        )
        assert response.status_code == 422  # FastAPI validation error (missing header)


class TestInferRole:
    def test_infer_role_uses_openrouter(self, client):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '["VP of Sales", "Director of Revenue", "Chief Revenue Officer"]'
                    }
                }
            ]
        }

        async_client = AsyncMock()
        async_client.__aenter__.return_value = async_client
        async_client.__aexit__.return_value = None
        async_client.post.return_value = mock_response

        with patch("app.api.routes.httpx.AsyncClient", return_value=async_client), \
             patch("app.api.routes.settings.OPENROUTER_API_KEY", "test-openrouter"), \
             patch("app.api.routes.settings.INFER_ROLE_MODEL", "test-infer-model"):
            response = client.post(
                "/api/v1/infer-role",
                headers={"Authorization": VALID_AUTH},
                json={
                    "what_you_sell": "AI outbound platform",
                    "target_audience": "B2B SaaS sales leaders",
                },
            )

        assert response.status_code == 200
        assert response.json()["roles"] == [
            "VP of Sales",
            "Director of Revenue",
            "Chief Revenue Officer",
        ]
        async_client.post.assert_awaited_once()
        _, kwargs = async_client.post.await_args
        assert kwargs["headers"]["Authorization"] == "Bearer test-openrouter"
        assert kwargs["json"]["model"] == "test-infer-model"
        assert kwargs["json"]["messages"][0]["role"] == "user"

    def test_infer_role_returns_empty_when_no_inputs(self, client):
        response = client.post(
            "/api/v1/infer-role",
            headers={"Authorization": VALID_AUTH},
            json={},
        )

        assert response.status_code == 200
        assert response.json() == {"roles": []}


# ──────────────────────────────────────────────────────────
# Session Start
# ──────────────────────────────────────────────────────────

class TestSessionStart:
    def test_start_session_returns_token_and_room(self, client):
        response = client.post(
            "/api/v1/sessions/start",
            headers={"Authorization": VALID_AUTH},
            json={
                "session_id": "sess-1",
                "room_name": "room-1",
                "scenario_id": "scenario-1",
                "persona_id": "persona-1",
                "user_id": "user-1",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["room_name"] == "room-1"
        assert data["token"] == "mock-jwt-token"

    def test_start_session_fetches_scenario_and_persona(self, client):
        with patch("app.api.routes.supabase_service") as mock_svc, \
             patch("app.api.routes.livekit_service") as mock_lk_svc:
            mock_svc.get_scenario = AsyncMock(return_value=MOCK_SCENARIO)
            mock_svc.get_persona = AsyncMock(return_value=MOCK_PERSONA)
            mock_lk_svc.create_room_and_token = AsyncMock(return_value="token")
            mock_lk_svc.start_pipeline = AsyncMock()

            response = client.post(
                "/api/v1/sessions/start",
                headers={"Authorization": VALID_AUTH},
                json={
                    "session_id": "sess-2",
                    "room_name": "room-2",
                    "scenario_id": "scenario-1",
                    "persona_id": "persona-1",
                    "user_id": "user-1",
                },
            )
            assert response.status_code == 200
            mock_svc.get_scenario.assert_called_once_with("scenario-1")
            mock_svc.get_persona.assert_called_once_with("persona-1")

    def test_start_session_404_when_scenario_not_found(self, client):
        with patch("app.api.routes.supabase_service") as mock_svc:
            mock_svc.get_scenario = AsyncMock(return_value=None)
            mock_svc.get_persona = AsyncMock(return_value=MOCK_PERSONA)

            response = client.post(
                "/api/v1/sessions/start",
                headers={"Authorization": VALID_AUTH},
                json={
                    "session_id": "sess-3",
                    "room_name": "room-3",
                    "scenario_id": "nonexistent",
                    "persona_id": "persona-1",
                    "user_id": "user-1",
                },
            )
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_start_session_404_when_persona_not_found(self, client):
        with patch("app.api.routes.supabase_service") as mock_svc:
            mock_svc.get_scenario = AsyncMock(return_value=MOCK_SCENARIO)
            mock_svc.get_persona = AsyncMock(return_value=None)

            response = client.post(
                "/api/v1/sessions/start",
                headers={"Authorization": VALID_AUTH},
                json={
                    "session_id": "sess-4",
                    "room_name": "room-4",
                    "scenario_id": "scenario-1",
                    "persona_id": "nonexistent",
                    "user_id": "user-1",
                },
            )
            assert response.status_code == 404

    def test_start_session_validates_request_body(self, client):
        response = client.post(
            "/api/v1/sessions/start",
            headers={"Authorization": VALID_AUTH},
            json={"session_id": "incomplete"},  # missing required fields
        )
        assert response.status_code == 422  # validation error

    def test_start_session_starts_pipeline(self, client):
        with patch("app.api.routes.supabase_service") as mock_svc, \
             patch("app.api.routes.livekit_service") as mock_lk_svc:
            mock_svc.get_scenario = AsyncMock(return_value=MOCK_SCENARIO)
            mock_svc.get_persona = AsyncMock(return_value=MOCK_PERSONA)
            mock_lk_svc.create_room_and_token = AsyncMock(return_value="token")
            mock_lk_svc.start_pipeline = AsyncMock()

            response = client.post(
                "/api/v1/sessions/start",
                headers={"Authorization": VALID_AUTH},
                json={
                    "session_id": "sess-5",
                    "room_name": "room-5",
                    "scenario_id": "scenario-1",
                    "persona_id": "persona-1",
                    "user_id": "user-1",
                },
            )
            assert response.status_code == 200
            mock_lk_svc.start_pipeline.assert_called_once()

    def test_start_session_passes_pitch_briefing_to_pipeline(self, client):
        with patch("app.api.routes.supabase_service") as mock_svc, \
             patch("app.api.routes.livekit_service") as mock_lk_svc:
            mock_svc.get_scenario = AsyncMock(return_value={**MOCK_SCENARIO, "call_type": "pitch"})
            mock_svc.get_persona = AsyncMock(return_value=MOCK_PERSONA)
            mock_lk_svc.create_room_and_token = AsyncMock(return_value="token")
            mock_lk_svc.start_pipeline = AsyncMock()

            payload = {
                "session_id": "sess-pitch-1",
                "room_name": "room-pitch-1",
                "scenario_id": "scenario-1",
                "persona_id": "persona-1",
                "user_id": "user-1",
                "pitch_context": "AI outbound assistant for SaaS teams",
                "pitch_briefing": {
                    "whatYouSell": "AI outbound assistant",
                    "targetAudience": "B2B SaaS sales teams",
                    "problemSolved": "Low outbound conversion rates",
                    "valueProposition": "Higher reply rates with less manual work",
                    "callGoal": "Secure pilot agreement",
                    "additionalNotes": "Competing with in-house process",
                },
            }
            response = client.post(
                "/api/v1/sessions/start",
                headers={"Authorization": VALID_AUTH},
                json=payload,
            )

            assert response.status_code == 200
            mock_lk_svc.start_pipeline.assert_called_once_with(
                room_name="room-pitch-1",
                session_id="sess-pitch-1",
                scenario={**MOCK_SCENARIO, "call_type": "pitch"},
                persona=MOCK_PERSONA,
                pitch_context="AI outbound assistant for SaaS teams",
                pitch_briefing=payload["pitch_briefing"],
                inferred_role=None,
            )


# ──────────────────────────────────────────────────────────
# Session End
# ──────────────────────────────────────────────────────────

class TestSessionEnd:
    def test_end_session_returns_success(self, client):
        response = client.post(
            "/api/v1/sessions/test-session-1/end",
            headers={"Authorization": VALID_AUTH},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ended"
        assert data["session_id"] == "test-session-1"

    def test_end_session_calls_stop_pipeline(self, client):
        with patch("app.api.routes.livekit_service") as mock_lk_svc:
            mock_lk_svc.stop_pipeline = AsyncMock()

            response = client.post(
                "/api/v1/sessions/sess-end-1/end",
                headers={"Authorization": VALID_AUTH},
            )
            assert response.status_code == 200
            mock_lk_svc.stop_pipeline.assert_called_once_with("sess-end-1")

    def test_end_session_requires_auth(self, client):
        response = client.post(
            "/api/v1/sessions/test-session-1/end",
            headers={"Authorization": INVALID_AUTH},
        )
        assert response.status_code == 401


class TestSessionState:
    def test_session_state_returns_service_state(self, client):
        with patch("app.api.routes.livekit_service") as mock_lk_svc:
            mock_lk_svc.get_session_state.return_value = {
                "sessionId": "sess-state-1",
                "phase": "ending",
                "autoEndRequested": True,
                "endReason": {
                    "speaker": "user",
                    "reasonCode": "closing_goodbye",
                    "trigger": "transcription_frame",
                },
                "requestedAt": "2026-03-09T00:00:00Z",
            }

            response = client.get(
                "/api/v1/sessions/sess-state-1/state",
                headers={"Authorization": VALID_AUTH},
            )

        assert response.status_code == 200
        assert response.json()["phase"] == "ending"
        assert response.json()["autoEndRequested"] is True

    def test_session_state_requires_auth(self, client):
        response = client.get(
            "/api/v1/sessions/sess-state-2/state",
            headers={"Authorization": INVALID_AUTH},
        )

        assert response.status_code == 401
