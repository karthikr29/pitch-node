"""
Pipecat pipeline for sales training voice conversations.
Pipeline: User Audio -> Deepgram STT -> LLM -> Cartesia TTS -> AI Audio
"""
import asyncio
from contextlib import suppress
from loguru import logger

import httpx
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.frames.frames import (
    Frame,
    TranscriptionFrame,
    TextFrame,
    LLMFullResponseEndFrame,
    TTSSpeakFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from app.config import settings
from app.services.supabase_service import SupabaseService
from app.services.analysis_service import AnalysisService
from app.prompts.system_prompts import build_system_prompt

supabase_service = SupabaseService()
analysis_service = AnalysisService()

OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"
_resolved_conversation_model: str | None = None
_model_resolution_lock = asyncio.Lock()


async def _is_openrouter_model_available(model: str) -> bool:
    if not settings.OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY is not configured")
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                OPENROUTER_CHAT_COMPLETIONS_URL,
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "ok"}],
                    "max_tokens": 1,
                    "temperature": 0,
                },
            )
            return response.is_success
    except Exception as e:
        logger.warning(f"Model availability probe failed for {model}: {e}")
        return False


async def resolve_conversation_model() -> str:
    global _resolved_conversation_model

    if _resolved_conversation_model:
        return _resolved_conversation_model

    async with _model_resolution_lock:
        if _resolved_conversation_model:
            return _resolved_conversation_model

        primary = (settings.CONVERSATION_MODEL or "").strip()
        fallback = (settings.CONVERSATION_FALLBACK_MODEL or "").strip()

        if not primary and fallback:
            primary = fallback
        if not primary:
            raise RuntimeError("CONVERSATION_MODEL is not configured")

        # If no fallback is configured, keep existing behavior.
        if not fallback or fallback == primary:
            _resolved_conversation_model = primary
            logger.info(f"Using conversation model: {_resolved_conversation_model}")
            return _resolved_conversation_model

        if await _is_openrouter_model_available(primary):
            _resolved_conversation_model = primary
            logger.info(f"Using conversation model: {_resolved_conversation_model}")
            return _resolved_conversation_model

        logger.warning(
            f"Primary conversation model '{primary}' unavailable. Falling back to '{fallback}'."
        )

        _resolved_conversation_model = fallback
        logger.info(f"Using conversation model: {_resolved_conversation_model}")
        return _resolved_conversation_model


class UserTranscriptCollector(FrameProcessor):
    """Collects user transcriptions from STT for saving to database."""

    def __init__(self, session_id: str, buffer: list[dict]):
        super().__init__()
        self._session_id = session_id
        self._buffer = buffer
        self._start_time = None

    def _get_timestamp_ms(self) -> int:
        if self._start_time is None:
            self._start_time = asyncio.get_event_loop().time()
        return int((asyncio.get_event_loop().time() - self._start_time) * 1000)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Capture user speech (from STT)
        if isinstance(frame, TranscriptionFrame):
            self._buffer.append({
                "speaker": "user",
                "content": frame.text,
                "timestamp_ms": self._get_timestamp_ms(),
                "confidence": getattr(frame, "confidence", None),
            })
            logger.debug(f"Captured user transcript: {frame.text[:50]}...")

        await self.push_frame(frame, direction)


class AIResponseCollector(FrameProcessor):
    """Collects AI responses from LLM for saving to database."""

    def __init__(self, session_id: str, buffer: list[dict]):
        super().__init__()
        self._session_id = session_id
        self._buffer = buffer
        self._start_time = None
        self._ai_text_buffer = ""

    def _get_timestamp_ms(self) -> int:
        if self._start_time is None:
            self._start_time = asyncio.get_event_loop().time()
        return int((asyncio.get_event_loop().time() - self._start_time) * 1000)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Accumulate AI response text chunks
        if isinstance(frame, TextFrame):
            self._ai_text_buffer += frame.text

        # When LLM completes response, save it
        elif isinstance(frame, LLMFullResponseEndFrame):
            if self._ai_text_buffer:
                self._buffer.append({
                    "speaker": "ai",
                    "content": self._ai_text_buffer.strip(),
                    "timestamp_ms": self._get_timestamp_ms(),
                    "confidence": None,
                })
                logger.debug(f"Captured AI transcript: {self._ai_text_buffer[:80]}...")
                self._ai_text_buffer = ""

        await self.push_frame(frame, direction)


async def run_post_call_analysis(session_id: str, scenario: dict, persona: dict):
    """Run post-call transcript analysis asynchronously."""
    try:
        all_transcripts = supabase_service.client.table("session_transcripts") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("timestamp_ms") \
            .execute()

        if all_transcripts.data:
            logger.info(f"Running post-call analysis on {len(all_transcripts.data)} transcript entries")
            analytics = await analysis_service.analyze_session(
                all_transcripts.data, scenario, persona
            )
            await supabase_service.save_analytics(session_id, analytics)
            logger.info(f"Post-call analysis completed for session {session_id}")
        else:
            logger.warning(f"No transcripts found for session {session_id}")
    except Exception as e:
        logger.error(f"Post-call analysis failed for session {session_id}: {e}")


async def create_sales_pipeline(
    room_name: str,
    session_id: str,
    scenario: dict,
    persona: dict,
    livekit_url: str,
    bot_token: str,
):
    """
    Creates and runs a Pipecat voice AI pipeline for a sales training session.

    Pipeline flow:
    transport.input() → STT → UserTranscriptCollector → context_aggregator.user() 
        → LLM → AIResponseCollector → TTS → transport.output() → context_aggregator.assistant()
    """
    logger.info(f"Starting pipeline for session {session_id} in room {room_name}")

    system_prompt = build_system_prompt(scenario, persona)
    transcript_buffer: list[dict] = []

    # Get Cartesia voice ID from persona
    default_voice = "a0e99841-438c-4a64-b679-ae501e7d6091"
    cartesia_voice_id = persona.get("cartesia_voice_id") or default_voice
    
    logger.info(f"Using Cartesia voice ID: {cartesia_voice_id}")

    # Initialize LiveKit transport
    transport = LiveKitTransport(
        url=livekit_url,
        token=bot_token,
        room_name=room_name,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            audio_in_passthrough=True,
        ),
    )

    stt = DeepgramSTTService(
        api_key=settings.DEEPGRAM_API_KEY,
    )

    conversation_model = await resolve_conversation_model()

    # Use OpenAI-compatible endpoint (OpenRouter) with streaming
    llm = OpenAILLMService(
        api_key=settings.OPENROUTER_API_KEY,
        model=conversation_model,
        base_url="https://openrouter.ai/api/v1",
    )

    # Cartesia TTS
    tts = CartesiaTTSService(
        api_key=settings.CARTESIA_API_KEY,
        voice_id=cartesia_voice_id,
        sample_rate=24000,
    )

    # Transcript collectors - one for user (after STT), one for AI (after LLM)
    user_transcript_collector = UserTranscriptCollector(session_id, transcript_buffer)
    ai_response_collector = AIResponseCollector(session_id, transcript_buffer)

    # Set up LLM context with system prompt
    context = OpenAILLMContext(
        messages=[{"role": "system", "content": system_prompt}],
    )
    context_aggregator = llm.create_context_aggregator(context)

    # Build the pipeline with collectors in correct positions
    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_transcript_collector,  # Capture user speech after STT
            context_aggregator.user(),
            llm,
            ai_response_collector,      # Capture AI response after LLM
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    # Event handlers
    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport_ref, participant_id: str):
        logger.info(f"User {participant_id} joined room {room_name}")
        greeting = f"Hello! I'm {persona.get('name', 'your AI prospect')}. How can I help you today?"
        await task.queue_frames([TTSSpeakFrame(text=greeting)])

    @transport.event_handler("on_participant_left")
    async def on_participant_left(transport_ref, participant_id: str, reason: str):
        logger.info(f"Participant {participant_id} left room {room_name}. Reason: {reason}")

    @stt.event_handler("on_connected")
    async def on_stt_connected(stt_ref, *args, **kwargs):
        logger.info(f"Deepgram STT connected for session {session_id}")

    @stt.event_handler("on_connection_error")
    async def on_stt_connection_error(stt_ref, error, *args, **kwargs):
        logger.error(f"Deepgram STT connection error for session {session_id}: {error}")

    # Periodic transcript flush (every 15s)
    async def flush_transcript():
        while True:
            await asyncio.sleep(15)
            if transcript_buffer:
                try:
                    await supabase_service.save_transcript(session_id, transcript_buffer.copy())
                    logger.debug(f"Flushed {len(transcript_buffer)} transcript entries")
                    transcript_buffer.clear()
                except Exception as e:
                    logger.error(f"Failed to save transcript: {e}")

    flush_task = asyncio.create_task(flush_transcript())

    # Run the pipeline
    runner = PipelineRunner()

    try:
        logger.info(f"Pipeline running for session {session_id}")
        await runner.run(task)
    except asyncio.CancelledError:
        logger.info(f"Pipeline cancelled for session {session_id}")
    except Exception as e:
        logger.error(f"Pipeline error for session {session_id}: {e}")
        raise
    finally:
        flush_task.cancel()
        with suppress(asyncio.CancelledError):
            await flush_task

        # Final flush of remaining transcripts
        if transcript_buffer:
            try:
                await supabase_service.save_transcript(session_id, transcript_buffer)
                logger.info(f"Saved final {len(transcript_buffer)} transcript entries")
            except Exception as e:
                logger.error(f"Failed to save final transcript: {e}")

        # Trigger post-call analysis in the background so session shutdown is immediate.
        analysis_task = asyncio.create_task(run_post_call_analysis(session_id, scenario, persona))
        analysis_task.add_done_callback(
            lambda task: logger.error(
                f"Background analysis task failed for session {session_id}: {task.exception()}"
            ) if not task.cancelled() and task.exception() else None
        )
