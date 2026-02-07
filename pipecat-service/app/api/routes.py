from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
import os

from app.services.livekit_service import LiveKitService
from app.services.supabase_service import SupabaseService

router = APIRouter()
livekit_service = LiveKitService()
supabase_service = SupabaseService()

def verify_api_key(authorization: str = Header(...)):
    expected = f"Bearer {os.getenv('PIPECAT_SERVICE_API_KEY', '')}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")

class StartSessionRequest(BaseModel):
    session_id: str
    room_name: str
    scenario_id: str
    persona_id: str
    user_id: str

class StartSessionResponse(BaseModel):
    token: str
    room_name: str

@router.post("/sessions/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest, _=Depends(verify_api_key)):
    # Fetch scenario and persona from Supabase
    scenario = await supabase_service.get_scenario(req.scenario_id)
    persona = await supabase_service.get_persona(req.persona_id)

    if not scenario or not persona:
        raise HTTPException(status_code=404, detail="Scenario or persona not found")

    # Create LiveKit room and get participant token
    token = await livekit_service.create_room_and_token(
        room_name=req.room_name,
        participant_name=req.user_id,
    )

    # Start the Pipecat pipeline in background
    # (Pipeline connects to the room as a bot participant)
    await livekit_service.start_pipeline(
        room_name=req.room_name,
        session_id=req.session_id,
        scenario=scenario,
        persona=persona,
    )

    return StartSessionResponse(token=token, room_name=req.room_name)

@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str, _=Depends(verify_api_key)):
    await livekit_service.stop_pipeline(session_id)
    return {"status": "ended", "session_id": session_id}

@router.get("/health")
async def health():
    return {"status": "ok"}
