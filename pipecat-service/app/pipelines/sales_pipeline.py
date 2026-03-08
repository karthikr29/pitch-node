"""
Pipecat pipeline for sales training voice conversations.
Pipeline: User Audio -> Deepgram STT -> LLM -> Cartesia TTS -> AI Audio
"""

import asyncio
import re
from contextlib import suppress

from num2words import num2words as _num2words
from typing import Any, Callable

import httpx
from loguru import logger
from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    EndFrame,
    Frame,
    InterimTranscriptionFrame,
    InterruptionFrame,
    LLMFullResponseEndFrame,
    TTSSpeakFrame,
    TextFrame,
    TranscriptionFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
    VADUserStartedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.flux.stt import DeepgramFluxSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport

from app.config import settings
from app.prompts.system_prompts import build_system_prompt
from app.services.analysis_service import AnalysisService
from app.services.supabase_service import SupabaseService

supabase_service = SupabaseService()
analysis_service = AnalysisService()

OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"
_resolved_conversation_model: str | None = None
_model_resolution_lock = asyncio.Lock()
USER_TURN_COMMIT_SILENCE_MS = 0
USER_TURN_FALLBACK_COMMIT_MS = 280
SOFT_REFUSAL_REPEAT_THRESHOLD = 2

HARD_STOP_PATTERNS = [
    re.compile(r"\b(not interested|no interest)\b"),
    re.compile(r"\b(stop|end|disconnect|hang up)\b.*\b(call|conversation)\b"),
    re.compile(r"\b(don['’]t|do not)\s+call\b"),
    re.compile(r"\bleave me alone\b"),
    re.compile(r"\b(goodbye|bye)\b"),
]
SOFT_REFUSAL_PATTERNS = [
    re.compile(r"^(no|nope|nah)\b"),
    re.compile(r"\bnot now\b"),
    re.compile(r"\bmaybe later\b"),
]


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


class TurnLatencyTracker:
    """Tracks user turn latency checkpoints for debugging responsiveness."""

    def __init__(self, session_id: str):
        self._session_id = session_id
        self._turn_id = 0
        self._last_stt_final_at: float | None = None
        self._active_turn: dict[str, Any] | None = None

    @staticmethod
    def _now() -> float:
        return asyncio.get_running_loop().time()

    def mark_stt_final(self):
        self._last_stt_final_at = self._now()

    def mark_user_commit(self):
        self._turn_id += 1
        self._active_turn = {
            "id": self._turn_id,
            "stt_final_at": self._last_stt_final_at,
            "commit_at": self._now(),
            "llm_first_token_at": None,
        }
        self._last_stt_final_at = None

    def mark_llm_first_token(self):
        if self._active_turn and self._active_turn.get("llm_first_token_at") is None:
            self._active_turn["llm_first_token_at"] = self._now()

    def mark_tts_start(self):
        if not self._active_turn:
            return

        now = self._now()
        turn = self._active_turn
        stt_final_at = turn.get("stt_final_at")
        commit_at = turn.get("commit_at")
        llm_first_token_at = turn.get("llm_first_token_at")

        stt_to_commit_ms = (commit_at - stt_final_at) * 1000 if stt_final_at and commit_at else None
        commit_to_llm_ms = (
            (llm_first_token_at - commit_at) * 1000
            if llm_first_token_at and commit_at
            else None
        )
        llm_to_tts_ms = (now - llm_first_token_at) * 1000 if llm_first_token_at else None
        reference = stt_final_at or commit_at
        total_ms = (now - reference) * 1000 if reference else None

        logger.info(
            "Turn latency session={} turn={} stt_to_commit_ms={} commit_to_llm_ms={} llm_to_tts_ms={} total_ms={}".format(
                self._session_id,
                turn["id"],
                f"{stt_to_commit_ms:.0f}" if stt_to_commit_ms is not None else "n/a",
                f"{commit_to_llm_ms:.0f}" if commit_to_llm_ms is not None else "n/a",
                f"{llm_to_tts_ms:.0f}" if llm_to_tts_ms is not None else "n/a",
                f"{total_ms:.0f}" if total_ms is not None else "n/a",
            )
        )
        self._active_turn = None


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

    def __init__(self, session_id: str, buffer: list[dict], latency_tracker: TurnLatencyTracker):
        super().__init__()
        self._session_id = session_id
        self._buffer = buffer
        self._latency_tracker = latency_tracker
        self._start_time = None
        self._ai_text_buffer = ""
        self._first_token_seen = False

    def _get_timestamp_ms(self) -> int:
        if self._start_time is None:
            self._start_time = asyncio.get_event_loop().time()
        return int((asyncio.get_event_loop().time() - self._start_time) * 1000)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Accumulate AI response text chunks
        if isinstance(frame, TextFrame):
            if frame.text and not self._first_token_seen:
                self._first_token_seen = True
                self._latency_tracker.mark_llm_first_token()
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
            self._first_token_seen = False

        await self.push_frame(frame, direction)


class NumberNormalizerProcessor(FrameProcessor):
    """Converts numerals in TTS text to spoken words to prevent digit-by-digit pronunciation."""

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, TextFrame) and frame.text:
            normalized = self._normalize(frame.text)
            frame = TextFrame(text=normalized)
        await self.push_frame(frame, direction)

    def _normalize(self, text: str) -> str:
        # Currency: $1,000 → "one thousand dollars"
        text = re.sub(
            r'\$([0-9,]+(?:\.\d+)?)',
            lambda m: _num2words(float(m.group(1).replace(',', ''))) + ' dollars',
            text
        )
        # Percentages: 30% → "thirty percent"
        text = re.sub(
            r'([0-9,]+(?:\.\d+)?)%',
            lambda m: _num2words(float(m.group(1).replace(',', ''))) + ' percent',
            text
        )
        # Scores/fractions: 7/10 → "seven out of ten"
        text = re.sub(
            r'([0-9]+)/([0-9]+)',
            lambda m: f"{_num2words(int(m.group(1)))} out of {_num2words(int(m.group(2)))}",
            text
        )
        # Ordinals: 1st, 2nd, 3rd, 4th → "first", "second", etc.
        text = re.sub(
            r'\b([0-9]+)(st|nd|rd|th)\b',
            lambda m: _num2words(int(m.group(1)), to='ordinal'),
            text
        )
        # Decimals: 7.5 → "seven point five"
        text = re.sub(
            r'\b([0-9]+)\.([0-9]+)\b',
            lambda m: _num2words(int(m.group(1))) + ' point ' + ' '.join(_num2words(int(d)) for d in m.group(2)),
            text
        )
        # Plain integers with commas: 1,000 → "one thousand"
        text = re.sub(
            r'\b([0-9]{1,3}(?:,[0-9]{3})+)\b',
            lambda m: _num2words(int(m.group(1).replace(',', ''))),
            text
        )
        # Plain integers: 30 → "thirty"
        text = re.sub(
            r'\b([0-9]+)\b',
            lambda m: _num2words(int(m.group(1))),
            text
        )
        return text


class OutputSpeechEventCollector(FrameProcessor):
    """Tracks when bot speech starts on output transport."""

    def __init__(self, latency_tracker: TurnLatencyTracker):
        super().__init__()
        self._latency_tracker = latency_tracker

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, BotStartedSpeakingFrame):
            self._latency_tracker.mark_tts_start()
        await self.push_frame(frame, direction)


class UserTurnGateProcessor(FrameProcessor):
    """Buffers final user transcripts and commits them after turn-end silence."""

    def __init__(
        self,
        session_id: str,
        latency_tracker: TurnLatencyTracker,
        on_auto_end: Callable[[dict[str, Any]], None],
        pipeline_task: PipelineTask | None = None,
        commit_silence_ms: int = USER_TURN_COMMIT_SILENCE_MS,
        fallback_commit_ms: int = USER_TURN_FALLBACK_COMMIT_MS,
    ):
        super().__init__()
        self._session_id = session_id
        self._latency_tracker = latency_tracker
        self._on_auto_end = on_auto_end
        self._task = pipeline_task
        self._commit_silence_ms = commit_silence_ms
        self._fallback_commit_ms = fallback_commit_ms
        self._pending_segments: list[TranscriptionFrame] = []
        self._pending_direction = FrameDirection.DOWNSTREAM
        self._commit_task: asyncio.Task | None = None
        self._user_is_speaking = False
        self._refusal_streak = 0
        self._auto_end_triggered = False

    def set_pipeline_task(self, pipeline_task: PipelineTask):
        self._task = pipeline_task

    async def cleanup(self):
        await self._cancel_commit_task()
        await super().cleanup()

    async def _cancel_commit_task(self):
        if self._commit_task and not self._commit_task.done():
            self._commit_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._commit_task
        self._commit_task = None

    def _schedule_commit(self, delay_ms: int, trigger: str):
        if self._auto_end_triggered:
            return
        if self._commit_task and not self._commit_task.done():
            self._commit_task.cancel()
        self._commit_task = asyncio.create_task(self._delayed_commit(delay_ms, trigger))

    async def _delayed_commit(self, delay_ms: int, trigger: str):
        try:
            await asyncio.sleep(delay_ms / 1000)
            await self._flush_pending_turn(trigger)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Failed delayed commit in session {self._session_id}: {e}")

    @staticmethod
    def _normalize_text(text: str) -> str:
        return re.sub(r"\s+", " ", text.lower()).strip()

    def _should_auto_end(self, text: str) -> tuple[bool, str]:
        normalized = self._normalize_text(text)
        if not normalized:
            self._refusal_streak = 0
            return False, ""

        if any(pattern.search(normalized) for pattern in HARD_STOP_PATTERNS):
            self._refusal_streak += 1
            return True, "explicit_user_end"

        if any(pattern.search(normalized) for pattern in SOFT_REFUSAL_PATTERNS):
            self._refusal_streak += 1
            if self._refusal_streak >= SOFT_REFUSAL_REPEAT_THRESHOLD:
                return True, "repeated_user_refusal"
            return False, ""

        self._refusal_streak = 0
        return False, ""

    async def _flush_pending_turn(self, trigger: str, force: bool = False):
        if not self._pending_segments or self._auto_end_triggered:
            return

        if self._user_is_speaking and not force:
            self._schedule_commit(self._fallback_commit_ms, "user_still_speaking")
            return

        segments = self._pending_segments.copy()
        self._pending_segments.clear()
        text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
        if not text:
            return

        self._latency_tracker.mark_user_commit()
        should_auto_end, auto_end_reason = self._should_auto_end(text)
        if should_auto_end:
            self._auto_end_triggered = True
            reason = {
                "type": "auto_end",
                "source": "ai",
                "reason": auto_end_reason,
                "trigger": trigger,
            }
            self._on_auto_end(reason)
            logger.info(
                f"Auto-ending session {self._session_id} after refusal detection: {auto_end_reason}"
            )
            if not self._task:
                logger.error(f"Unable to auto-end session {self._session_id}: pipeline task not set")
                return
            await self._task.queue_frames(
                [
                    TTSSpeakFrame(text="Understood. I'll let you go now. Goodbye."),
                    EndFrame(reason=reason),
                ]
            )
            return

        template = segments[-1]
        merged_frame = TranscriptionFrame(
            text=text,
            user_id=template.user_id,
            timestamp=template.timestamp,
            language=template.language,
            result=template.result,
            finalized=True,
        )
        await self.push_frame(merged_frame, self._pending_direction)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, (UserStartedSpeakingFrame, VADUserStartedSpeakingFrame)):
            self._user_is_speaking = True
            await self._cancel_commit_task()
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, InterruptionFrame):
            # InterruptionFrame is concurrent and does not always have a matching
            # stop event when STT VAD events are disabled. Treat it as a commit
            # cancellation signal only, not a durable speaking-state toggle.
            await self._cancel_commit_task()
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, (UserStoppedSpeakingFrame, VADUserStoppedSpeakingFrame)):
            self._user_is_speaking = False
            self._schedule_commit(self._commit_silence_ms, "user_stopped_speaking")
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, TranscriptionFrame):
            # A final transcription candidate means STT has already segmented
            # speech; bias to fast commit unless explicit speaking-state says otherwise.
            self._user_is_speaking = False
            self._pending_direction = direction
            if frame.text.strip():
                self._latency_tracker.mark_stt_final()
                self._pending_segments.append(frame)
                self._schedule_commit(self._commit_silence_ms, "transcription_frame")
            return

        if isinstance(frame, InterimTranscriptionFrame):
            # Don't forward interim text into LLM context; we commit merged final turns.
            return

        if isinstance(frame, EndFrame):
            await self._cancel_commit_task()
            self._pending_segments.clear()
            await self.push_frame(frame, direction)
            return

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
    pitch_context: str = "",
    pitch_briefing: dict | None = None,
    inferred_role: str | None = None,
):
    """
    Creates and runs a Pipecat voice AI pipeline for a sales training session.

    Pipeline flow:
    transport.input() -> STT -> UserTranscriptCollector -> UserTurnGateProcessor
        -> context_aggregator.user() -> LLM -> AIResponseCollector -> TTS
        -> transport.output() -> OutputSpeechEventCollector -> context_aggregator.assistant()
    """
    logger.info(f"Starting pipeline for session {session_id} in room {room_name}")

    pipeline_result: dict[str, Any] = {
        "session_id": session_id,
        "room_name": room_name,
        "auto_complete_session": False,
        "end_reason": None,
    }

    system_prompt = build_system_prompt(
        scenario,
        persona,
        pitch_context=pitch_context,
        pitch_briefing=pitch_briefing,
        inferred_role=inferred_role,
    )
    transcript_buffer: list[dict] = []
    latency_tracker = TurnLatencyTracker(session_id)

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

    stt = DeepgramFluxSTTService(
        api_key=settings.DEEPGRAM_API_KEY,
        params=DeepgramFluxSTTService.InputParams(
            eot_threshold=0.6,       # lower = fires sooner; 0.7 is default (conservative)
            eot_timeout_ms=3000,     # fallback: force EOT after 3s if semantic detection missed
        ),
    )

    conversation_model = await resolve_conversation_model()

    # Use OpenAI-compatible endpoint (OpenRouter) with streaming
    # Provider pinning bypasses OpenRouter's load balancer (~50-70ms overhead) and routes
    # directly to xAI's infrastructure (~25ms overhead).
    llm = OpenAILLMService(
        api_key=settings.OPENROUTER_API_KEY,
        model=conversation_model,
        base_url="https://openrouter.ai/api/v1",
        params=OpenAILLMService.InputParams(
            extra={
                "extra_body": {
                    "provider": {
                        "order": ["xAI"],
                        "allow_fallbacks": False,
                    }
                }
            }
        ),
    )

    # Cartesia TTS
    tts = CartesiaTTSService(
        api_key=settings.CARTESIA_API_KEY,
        voice_id=cartesia_voice_id,
        sample_rate=24000,
        aggregate_sentences=False,
    )

    # Transcript collectors - one for user (after STT), one for AI (after LLM)
    user_transcript_collector = UserTranscriptCollector(session_id, transcript_buffer)
    ai_response_collector = AIResponseCollector(session_id, transcript_buffer, latency_tracker)
    output_speech_collector = OutputSpeechEventCollector(latency_tracker)

    # Set up LLM context with system prompt
    context = OpenAILLMContext(
        messages=[{"role": "system", "content": system_prompt}],
    )
    context_aggregator = llm.create_context_aggregator(context)

    number_normalizer = NumberNormalizerProcessor()

    turn_gate = UserTurnGateProcessor(
        session_id=session_id,
        latency_tracker=latency_tracker,
        on_auto_end=lambda reason: pipeline_result.update(
            {"auto_complete_session": True, "end_reason": reason}
        ),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_transcript_collector,  # Capture user speech after STT
            turn_gate,                  # Commit only completed user turns to the LLM
            context_aggregator.user(),
            llm,
            ai_response_collector,      # Capture AI response after LLM
            number_normalizer,          # Convert numerals to spoken words before TTS
            tts,
            transport.output(),
            output_speech_collector,    # Track bot speech start for latency metrics
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
    turn_gate.set_pipeline_task(task)

    # Event handlers
    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport_ref, participant: Any):
        participant_id = getattr(participant, "identity", participant)
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
        logger.error(
            f"Deepgram STT connection error for session {session_id}: {error} ({type(error).__name__})"
        )

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
        pipeline_result["end_reason"] = {"type": "cancelled", "source": "manual_or_shutdown"}
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

    return pipeline_result
