import base64
import os
import json as _json

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger
from pydantic import BaseModel, Field
from typing import Optional

from app.config import settings
from app.services.livekit_service import LiveKitService
from app.services.supabase_service import SupabaseService
from app.services.voiceprint_service import (
    VoiceprintService,
    VoiceprintQualityError,
    assess_audio_quality,
    pcm16_bytes_to_float,
)

router = APIRouter()
livekit_service = LiveKitService()
supabase_service = SupabaseService()

def verify_api_key(authorization: str = Header(...)):
    expected = f"Bearer {os.getenv('PIPECAT_SERVICE_API_KEY', '')}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")

class InferRoleRequest(BaseModel):
    what_you_sell: str = Field(default="", max_length=500)
    target_audience: str = Field(default="", max_length=500)
    pitch_context: str = Field(default="", max_length=2000)


class StartSessionRequest(BaseModel):
    session_id: str = Field(max_length=36)
    room_name: str = Field(max_length=100)
    scenario_id: str = Field(max_length=36)
    persona_id: str = Field(max_length=36)
    user_id: str = Field(max_length=36)
    pitch_context: str = Field(default="", max_length=3000)
    pitch_briefing: Optional[dict] = None
    inferred_role: Optional[str] = Field(default=None, max_length=150)
    voiceprint: Optional[str] = Field(default=None, max_length=10_000)


class VoiceprintEnrollRequest(BaseModel):
    audio_b64: str = Field(min_length=1, max_length=1_000_000)
    sample_rate: int = Field(default=16000, ge=8000, le=48000)
    duration_ms: Optional[int] = Field(default=None, ge=500, le=20000)


class VoiceprintEnrollResponse(BaseModel):
    voiceprint_b64: str
    embedding_dim: int
    duration_ms: int
    snr_db: float

class StartSessionResponse(BaseModel):
    token: str
    room_name: str

class SessionConnectedRequest(BaseModel):
    max_duration_seconds: Optional[int] = Field(default=None, ge=1, le=180000)

@router.post("/infer-role")
async def infer_role(req: InferRoleRequest, _=Depends(verify_api_key)):
    if req.what_you_sell and req.target_audience:
        prompt = (
            f"Someone is selling: {req.what_you_sell}\n"
            f"Their target market: {req.target_audience}\n\n"
            "List 3 realistic job titles of decision-makers they would typically pitch to.\n"
            'Reply with ONLY a JSON array of 3 strings. Example: ["VP of Sales", "Director of Revenue", "Chief Revenue Officer"]'
        )
    elif req.pitch_context:
        prompt = (
            f"Someone is selling the following: {req.pitch_context}\n\n"
            "List 3 realistic job titles of decision-makers they would typically pitch to.\n"
            'Reply with ONLY a JSON array of 3 strings. Example: ["VP of Sales", "Director of Revenue", "Chief Revenue Officer"]'
        )
    else:
        logger.debug("infer-role: empty input, returning empty roles")
        return {"roles": []}

    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not configured")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.INFER_ROLE_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 80,
                },
            )
            response.raise_for_status()
            result = response.json()
        raw = result["choices"][0]["message"]["content"].strip()
    except httpx.TimeoutException:
        logger.warning("infer-role: OpenRouter timed out")
        raise HTTPException(status_code=504, detail="Inference service timed out")
    except httpx.HTTPStatusError as e:
        logger.warning("infer-role: OpenRouter HTTP error", extra={"status_code": e.response.status_code})
        raise HTTPException(status_code=502, detail=f"Inference service error: {e.response.status_code}")
    except Exception:
        raise HTTPException(status_code=502, detail="Inference failed")
    try:
        roles = _json.loads(raw)
        if not isinstance(roles, list) or len(roles) == 0:
            raise ValueError
        roles = [str(r).strip() for r in roles[:3]]
    except Exception:
        logger.warning("infer-role: JSON parse failed, using fallback", extra={"raw_preview": raw[:50] if raw else ""})
        roles = [raw] if raw else ["Decision Maker"]

    logger.info("infer-role: succeeded", extra={"roles_count": len(roles)})
    return {"roles": roles}


@router.post("/sessions/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest, _=Depends(verify_api_key)):
    logger.info(
        "sessions/start: received",
        extra={"session_id": req.session_id, "scenario_id": req.scenario_id, "persona_id": req.persona_id}
    )

    # Fetch scenario and persona from Supabase
    scenario = await supabase_service.get_scenario(req.scenario_id)
    persona = await supabase_service.get_persona(req.persona_id)

    if not scenario or not persona:
        logger.warning(
            "sessions/start: scenario or persona not found",
            extra={"session_id": req.session_id, "scenario_found": scenario is not None, "persona_found": persona is not None}
        )
        raise HTTPException(status_code=404, detail="Scenario or persona not found")

    # Create LiveKit room and get participant token
    try:
        token = await livekit_service.create_room_and_token(
            room_name=req.room_name,
            participant_name=req.user_id,
        )
    except Exception as e:
        logger.error(
            "sessions/start: LiveKit room creation failed",
            extra={"session_id": req.session_id, "error": str(e)}
        )
        raise HTTPException(status_code=502, detail="Failed to initialize voice session")

    # Start the Pipecat pipeline in background
    # (Pipeline connects to the room as a bot participant)
    await livekit_service.start_pipeline(
        room_name=req.room_name,
        session_id=req.session_id,
        scenario=scenario,
        persona=persona,
        pitch_context=req.pitch_context,
        pitch_briefing=req.pitch_briefing,
        inferred_role=req.inferred_role,
        voiceprint_b64=req.voiceprint,
    )

    logger.info("sessions/start: pipeline started", extra={"session_id": req.session_id, "room_name": req.room_name})
    return StartSessionResponse(token=token, room_name=req.room_name)

@router.post("/sessions/{session_id}/connected")
async def session_connected(
    session_id: str,
    req: SessionConnectedRequest,
    _=Depends(verify_api_key),
):
    logger.info(
        "sessions/connected: received",
        extra={
            "session_id": session_id,
            "max_duration_seconds": req.max_duration_seconds,
        },
    )
    livekit_service.schedule_connected_time_limit(session_id, req.max_duration_seconds)
    return {"status": "ok", "session_id": session_id}

@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str, _=Depends(verify_api_key)):
    logger.info("sessions/end: received", extra={"session_id": session_id})
    await livekit_service.stop_pipeline(session_id)
    logger.info("sessions/end: pipeline stopped", extra={"session_id": session_id})
    return {"status": "ended", "session_id": session_id}

@router.get("/sessions/{session_id}/state")
async def session_state(session_id: str, _=Depends(verify_api_key)):
    state = livekit_service.get_session_state(session_id)
    logger.debug("sessions/state: queried", extra={"session_id": session_id, "phase": state.get("phase", "unknown")})
    return state

@router.post("/voiceprint/enroll", response_model=VoiceprintEnrollResponse)
async def voiceprint_enroll(req: VoiceprintEnrollRequest, _=Depends(verify_api_key)):
    """Compute a per-call voiceprint from a short PCM16 sample.

    The audio is base64-encoded little-endian PCM16. Server-side gates mirror
    the client-side gates and add an SNR-based ``TOO_NOISY`` check.
    """
    try:
        raw = base64.b64decode(req.audio_b64, validate=True)
    except Exception:
        raise HTTPException(status_code=422, detail={"code": "INVALID_BASE64"})

    if len(raw) > settings.VOICEPRINT_ENROLL_MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail={"code": "PAYLOAD_TOO_LARGE"})
    if len(raw) < 2:
        raise HTTPException(status_code=422, detail={"code": "TOO_SHORT"})

    pcm = pcm16_bytes_to_float(raw)
    sample_rate = req.sample_rate
    duration_ms = int(round(pcm.size * 1000 / sample_rate))
    if duration_ms < settings.VOICEPRINT_ENROLL_MIN_DURATION_MS:
        raise HTTPException(status_code=422, detail={"code": "TOO_SHORT"})
    if duration_ms > settings.VOICEPRINT_ENROLL_MAX_DURATION_MS:
        raise HTTPException(status_code=422, detail={"code": "TOO_LONG"})

    report = assess_audio_quality(pcm, sample_rate)
    try:
        from app.services.voiceprint_service import enforce_enrollment_quality

        enforce_enrollment_quality(report)
    except VoiceprintQualityError as q:
        logger.info(
            "voiceprint_enroll: rejected code={} rms_p95={:.4f} peak={:.4f} voiced={:.2f} snr={:.1f}",
            q.code,
            report.rms_p95,
            report.peak_max,
            report.voiced_ratio,
            report.snr_db,
        )
        raise HTTPException(status_code=422, detail={"code": q.code})

    try:
        emb = VoiceprintService.compute_embedding(pcm, sample_rate)
    except Exception as e:
        logger.error("voiceprint_enroll: embedding failed err={}", e)
        raise HTTPException(status_code=422, detail={"code": "EMBEDDING_FAILED"})

    voiceprint_b64 = VoiceprintService.encode(emb)
    logger.info(
        "voiceprint_enroll: ok dim={} duration_ms={} snr={:.1f}",
        emb.shape[0],
        duration_ms,
        report.snr_db,
    )
    return VoiceprintEnrollResponse(
        voiceprint_b64=voiceprint_b64,
        embedding_dim=int(emb.shape[0]),
        duration_ms=duration_ms,
        snr_db=round(report.snr_db, 2),
    )


@router.get("/health")
async def health():
    return {"status": "ok"}
