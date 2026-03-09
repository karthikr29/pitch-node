from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
import os
import httpx
import json as _json

from app.config import settings
from app.services.livekit_service import LiveKitService
from app.services.supabase_service import SupabaseService

router = APIRouter()
livekit_service = LiveKitService()
supabase_service = SupabaseService()

def verify_api_key(authorization: str = Header(...)):
    expected = f"Bearer {os.getenv('PIPECAT_SERVICE_API_KEY', '')}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")

class InferRoleRequest(BaseModel):
    what_you_sell: str = ""
    target_audience: str = ""
    pitch_context: str = ""


class StartSessionRequest(BaseModel):
    session_id: str
    room_name: str
    scenario_id: str
    persona_id: str
    user_id: str
    pitch_context: str = ""
    pitch_briefing: Optional[dict] = None
    inferred_role: Optional[str] = None

class StartSessionResponse(BaseModel):
    token: str
    room_name: str

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
        raise HTTPException(status_code=504, detail="Inference service timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Inference service error: {e.response.status_code}")
    except Exception:
        raise HTTPException(status_code=502, detail="Inference failed")
    try:
        roles = _json.loads(raw)
        if not isinstance(roles, list) or len(roles) == 0:
            raise ValueError
        roles = [str(r).strip() for r in roles[:3]]
    except Exception:
        roles = [raw] if raw else ["Decision Maker"]

    return {"roles": roles}


@router.post("/sessions/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest, _=Depends(verify_api_key)):
    # Fetch scenario and persona from Supabase
    scenario = await supabase_service.get_scenario(req.scenario_id)
    persona = await supabase_service.get_persona(req.persona_id)

    if not scenario or not persona:
        raise HTTPException(status_code=404, detail="Scenario or persona not found")

    # Create LiveKit room and get participant token
    try:
        token = await livekit_service.create_room_and_token(
            room_name=req.room_name,
            participant_name=req.user_id,
        )
    except Exception as e:
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
    )

    return StartSessionResponse(token=token, room_name=req.room_name)

@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str, _=Depends(verify_api_key)):
    await livekit_service.stop_pipeline(session_id)
    return {"status": "ended", "session_id": session_id}

@router.get("/health")
async def health():
    return {"status": "ok"}
