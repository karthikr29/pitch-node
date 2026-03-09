"""
Pipecat pipeline for sales training voice conversations.

Pipeline: LiveKit -> Deepgram Flux -> Grok 4.1 Fast -> Cartesia -> LiveKit
"""

import asyncio
import json
import re
from contextlib import suppress
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import urlencode

import websockets
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import (
    EndFrame,
    Frame,
    InterimTranscriptionFrame,
    InterruptionFrame,
    LLMFullResponseEndFrame,
    LLMTextFrame,
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
from pipecat.services.deepgram.stt import DeepgramSTTService, LiveOptions
from pipecat.services.openrouter.llm import OpenRouterLLMService
from pipecat.services.settings import STTSettings
from pipecat.services.stt_service import STTService
from pipecat.services.tts_service import TextAggregationMode
from pipecat.transcriptions.language import Language
from pipecat.transports.livekit.transport import LiveKitParams, LiveKitTransport

from app.config import settings
from app.prompts.system_prompts import build_system_prompt
from app.services.analysis_service import AnalysisService
from app.services.supabase_service import SupabaseService


try:
    from num2words import num2words as _num2words
except ModuleNotFoundError:
    def _num2words(value, to=None):
        return str(value)


supabase_service = SupabaseService()
analysis_service = AnalysisService()

DEFAULT_CARTESIA_VOICE = "a0e99841-438c-4a64-b679-ae501e7d6091"
TRANSCRIPT_FLUSH_INTERVAL_SECS = 15
CONTEXT_SUMMARY_MAX_CHARS = 1600
TOKEN_RE = re.compile(r"\S+")
CLAUSE_BOUNDARY_RE = re.compile(r"[,:;?!.]")
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


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def resolve_conversation_model() -> str:
    return (settings.CONVERSATION_MODEL or "google/gemini-2.5-flash-lite-preview-09-2025").strip()


def build_conversation_llm(conversation_model: str) -> OpenRouterLLMService:
    if not settings.OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is required for the live conversation path")

    logger.info(f"Using OpenRouter for conversation model: {conversation_model}")
    return OpenRouterLLMService(
        api_key=settings.OPENROUTER_API_KEY,
        model=conversation_model,
    )


def _is_flux_model(model: str) -> bool:
    return model.strip().lower().startswith("flux")


def build_fallback_stt_service() -> DeepgramSTTService:
    live_options = LiveOptions(
        encoding="linear16",
        language=Language.EN,
        model=settings.DEEPGRAM_FALLBACK_STT_MODEL,
        channels=1,
        interim_results=True,
        smart_format=False,
        punctuate=True,
        profanity_filter=True,
        vad_events=False,
    )
    return DeepgramSTTService(
        api_key=settings.DEEPGRAM_API_KEY,
        sample_rate=16000,
        live_options=live_options,
    )


class UserTranscriptCollector(FrameProcessor):
    """Collects final user transcriptions for transcript persistence."""

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

        if isinstance(frame, TranscriptionFrame):
            self._buffer.append(
                {
                    "speaker": "user",
                    "content": frame.text,
                    "timestamp_ms": self._get_timestamp_ms(),
                    "confidence": getattr(frame, "confidence", None),
                }
            )

        await self.push_frame(frame, direction)


class AIResponseCollector(FrameProcessor):
    """Collects AI responses from streamed LLM text frames."""

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

        if isinstance(frame, (TextFrame, LLMTextFrame)):
            text = getattr(frame, "text", "")
            self._ai_text_buffer += text
        elif isinstance(frame, LLMFullResponseEndFrame):
            if self._ai_text_buffer:
                self._buffer.append(
                    {
                        "speaker": "ai",
                        "content": self._ai_text_buffer.strip(),
                        "timestamp_ms": self._get_timestamp_ms(),
                        "confidence": None,
                    }
                )
                self._ai_text_buffer = ""

        await self.push_frame(frame, direction)


class NumberNormalizerProcessor(FrameProcessor):
    """Converts numerals in TTS text to spoken words."""

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, TextFrame) and frame.text:
            frame = TextFrame(text=self._normalize(frame.text))
        await self.push_frame(frame, direction)

    def _normalize(self, text: str) -> str:
        # 1. Time formats (HH:MM AM/PM) — must be first before digits are consumed
        def _time_to_words(m: re.Match) -> str:
            hour = int(m.group(1))
            minute = int(m.group(2))
            period = (m.group(3) or "").strip().upper()
            hour_word = _num2words(hour)
            if minute == 0:
                minute_part = ""
            elif minute < 10:
                minute_part = f" oh {_num2words(minute)}"
            else:
                minute_part = f" {_num2words(minute)}"
            period_part = f" {period}" if period else ""
            return f"{hour_word}{minute_part}{period_part}"

        text = re.sub(
            r"\b(1[0-2]|0?[1-9]):(0[0-9]|[1-5][0-9])\s*(AM|PM|am|pm)\b",
            _time_to_words,
            text,
        )

        # 2. Phone numbers — before large-number and integer patterns
        def _phone_to_words(m: re.Match) -> str:
            digits = re.sub(r"\D", "", m.group(0))
            words = ["oh" if d == "0" else _num2words(int(d)) for d in digits]
            if len(digits) == 10:
                return f"{' '.join(words[:3])}, {' '.join(words[3:6])}, {' '.join(words[6:])}"
            if len(digits) == 11 and digits[0] == "1":
                return f"one, {' '.join(words[1:4])}, {' '.join(words[4:7])}, {' '.join(words[7:])}"
            return " ".join(words)

        text = re.sub(
            r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
            _phone_to_words,
            text,
        )

        # 3 & 4. Large abbreviated numbers ($1.2M, 500K, 2.5B) — before dollar/integer patterns
        _LARGE_SUFFIXES = {"k": "thousand", "m": "million", "b": "billion", "t": "trillion"}

        def _large_num_to_words(m: re.Match) -> str:
            has_dollar = bool(m.group(1))
            integer_str = m.group(2).replace(",", "")
            decimal_str = m.group(3)
            suffix_word = _LARGE_SUFFIXES[m.group(4).lower()]
            if decimal_str:
                dec_digits = decimal_str.lstrip(".")
                num_part = (
                    f"{_num2words(int(integer_str))} point "
                    f"{' '.join(_num2words(int(d)) for d in dec_digits)}"
                )
            else:
                num_part = _num2words(int(integer_str))
            result = f"{num_part} {suffix_word}"
            if has_dollar:
                result += " dollars"
            return result

        text = re.sub(
            r"(\$?)(\d{1,3}(?:,\d{3})*)(\.\d+)?([KMBTkmbt])\b",
            _large_num_to_words,
            text,
        )

        # 5. Multipliers (3x, 10x, 2.5x) — before integer catch-all
        def _multiplier_to_words(m: re.Match) -> str:
            raw = m.group(1)
            value = float(raw)
            if value == int(value):
                return f"{_num2words(int(value))} times"
            int_part = int(value)
            dec_digits = raw.split(".")[1]
            return (
                f"{_num2words(int_part)} point "
                f"{' '.join(_num2words(int(d)) for d in dec_digits)} times"
            )

        text = re.sub(r"\b(\d+(?:\.\d+)?)[xX]\b", _multiplier_to_words, text)

        # 6. Percent ranges (10-20%) — before percent regex
        def _pct_range_to_words(m: re.Match) -> str:
            lo = float(m.group(1))
            hi = float(m.group(2))
            lo_word = _num2words(int(lo)) if lo == int(lo) else _num2words(lo)
            hi_word = _num2words(int(hi)) if hi == int(hi) else _num2words(hi)
            return f"{lo_word} to {hi_word} percent"

        text = re.sub(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)%", _pct_range_to_words, text)

        # 7. Dollar ranges ($50-$100) — before dollar regex
        def _dollar_range_to_words(m: re.Match) -> str:
            lo_raw = m.group(1).replace(",", "")
            hi_raw = m.group(2).replace(",", "")
            lo = float(lo_raw)
            hi = float(hi_raw)
            lo_word = _num2words(int(lo)) if lo == int(lo) else _num2words(lo)
            hi_word = _num2words(int(hi)) if hi == int(hi) else _num2words(hi)
            return f"{lo_word} to {hi_word} dollars"

        text = re.sub(
            r"\$([0-9,]+(?:\.\d+)?)-\$([0-9,]+(?:\.\d+)?)",
            _dollar_range_to_words,
            text,
        )

        # 8. Leading-zero-less decimals (.5%, .25) — before percent and decimal patterns
        text = re.sub(
            r"(?<!\d)\.(\d+)%",
            lambda m: f"point {' '.join(_num2words(int(d)) for d in m.group(1))} percent",
            text,
        )
        text = re.sub(
            r"(?<!\d)\.(\d+)\b",
            lambda m: f"point {' '.join(_num2words(int(d)) for d in m.group(1))}",
            text,
        )

        # 9. Dollar amounts
        def _dollar_to_words(m: re.Match) -> str:
            raw = m.group(1).replace(",", "")
            value = float(raw)
            if value == int(value):
                return f"{_num2words(int(value))} dollars"
            dollars = int(value)
            cents = round((value - dollars) * 100)
            if cents == 0:
                return f"{_num2words(dollars)} dollars"
            return f"{_num2words(dollars)} dollars and {_num2words(cents)} cents"

        text = re.sub(r"\$([0-9,]+(?:\.\d+)?)", _dollar_to_words, text)

        # 10. Percentages
        def _pct_to_words(m: re.Match) -> str:
            raw = m.group(1).replace(",", "")
            value = float(raw)
            spoken = _num2words(int(value)) if value == int(value) else _num2words(value)
            return f"{spoken} percent"

        text = re.sub(r"([0-9,]+(?:\.\d+)?)%", _pct_to_words, text)

        # 11. Fractions (X/Y)
        text = re.sub(
            r"([0-9]+)/([0-9]+)",
            lambda m: f"{_num2words(int(m.group(1)))} out of {_num2words(int(m.group(2)))}",
            text,
        )

        # 12. Ordinals (1st, 2nd, etc.)
        text = re.sub(
            r"\b([0-9]+)(st|nd|rd|th)\b",
            lambda m: _num2words(int(m.group(1)), to="ordinal"),
            text,
        )

        # 13. Decimals (X.Y)
        text = re.sub(
            r"\b([0-9]+)\.([0-9]+)\b",
            lambda m: _num2words(int(m.group(1)))
            + " point "
            + " ".join(_num2words(int(d)) for d in m.group(2)),
            text,
        )

        # 14. Comma-separated thousands (1,000,000)
        text = re.sub(
            r"\b([0-9]{1,3}(?:,[0-9]{3})+)\b",
            lambda m: _num2words(int(m.group(1).replace(",", ""))),
            text,
        )

        # 15. Year pronunciation: 2000-2099 → "twenty X" (natural speech)
        def _year_to_words(m: re.Match) -> str:
            tens = int(m.group(1)) - 2000
            if tens == 0:
                return "two thousand"
            elif tens < 10:
                return f"twenty oh {_num2words(tens)}"
            else:
                return f"twenty {_num2words(tens)}"

        text = re.sub(r"\b(20\d{2})\b", _year_to_words, text)

        # 16. Ratio colons (3:1) — after time pattern (AM/PM consumed), before integer catch-all
        text = re.sub(
            r"\b(\d+):(\d+)\b",
            lambda m: f"{_num2words(int(m.group(1)))} to {_num2words(int(m.group(2)))}",
            text,
        )

        # 17. Integer catch-all
        text = re.sub(
            r"\b([0-9]+)\b",
            lambda m: _num2words(int(m.group(1))),
            text,
        )
        return text


class ConversationContextManager(FrameProcessor):
    """Bounds conversation context and maintains a local rolling summary."""

    def __init__(self, context: OpenAILLMContext):
        super().__init__()
        self._context = context
        self._max_recent_messages = max(2, settings.VOICE_CONTEXT_MAX_TURNS * 2)
        self._summary_text = ""

    @staticmethod
    def _message_text(message: dict[str, Any]) -> str:
        content = message.get("content", "")
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            texts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    texts.append(str(item.get("text", "")).strip())
            return " ".join(text for text in texts if text).strip()
        return ""

    @staticmethod
    def _is_summary_message(message: dict[str, Any]) -> bool:
        return (
            message.get("role") == "system"
            and ConversationContextManager._message_text(message).startswith("[Conversation summary]")
        )

    def _summary_message(self) -> dict[str, str]:
        return {
            "role": "system",
            "content": f"[Conversation summary]\n{self._summary_text}".strip(),
        }

    def _compose_local_summary(self, evicted_messages: list[dict[str, Any]]) -> str:
        snippets: list[str] = []
        if self._summary_text:
            snippets.append(self._summary_text)

        for message in evicted_messages[-12:]:
            role = (message.get("role") or "context").capitalize()
            text = self._message_text(message)
            if text:
                snippets.append(f"{role}: {text[:180]}")

        merged = "\n".join(snippets).strip()
        if len(merged) > CONTEXT_SUMMARY_MAX_CHARS:
            merged = merged[-CONTEXT_SUMMARY_MAX_CHARS:]
        return merged

    def _prune_messages_locked(self) -> list[dict[str, Any]]:
        messages = list(self._context.get_messages())
        system_messages = [
            message
            for message in messages
            if message.get("role") == "system" and not self._is_summary_message(message)
        ]
        conversation_messages = [
            message for message in messages if message.get("role") != "system"
        ]

        if len(conversation_messages) <= self._max_recent_messages:
            return []

        evicted_messages = conversation_messages[:-self._max_recent_messages]
        recent_messages = conversation_messages[-self._max_recent_messages :]
        self._summary_text = self._compose_local_summary(evicted_messages)

        rebuilt_messages = list(system_messages)
        if self._summary_text:
            rebuilt_messages.append(self._summary_message())
        rebuilt_messages.extend(recent_messages)
        self._context.set_messages(rebuilt_messages)
        return evicted_messages

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseEndFrame):
            self._prune_messages_locked()

        await self.push_frame(frame, direction)


class ClauseChunkingProcessor(FrameProcessor):
    """Flushes streamed LLM text into low-latency Cartesia-friendly chunks."""

    def __init__(self):
        super().__init__()
        self._buffer = ""
        self._first_chunk_sent = False
        self._first_chunk_timer: asyncio.Task | None = None

    async def cleanup(self):
        await self._cancel_first_chunk_timer()
        await super().cleanup()

    async def _cancel_first_chunk_timer(self):
        if self._first_chunk_timer and not self._first_chunk_timer.done():
            self._first_chunk_timer.cancel()
            with suppress(asyncio.CancelledError):
                await self._first_chunk_timer
        self._first_chunk_timer = None

    def _token_count(self) -> int:
        return len(TOKEN_RE.findall(self._buffer))

    def _ends_with_clause_boundary(self) -> bool:
        stripped = self._buffer.rstrip()
        return bool(stripped) and bool(CLAUSE_BOUNDARY_RE.search(stripped[-1]))

    def _should_flush_now(self) -> bool:
        token_count = self._token_count()
        if self._ends_with_clause_boundary():
            return True

        if not self._first_chunk_sent:
            return token_count >= settings.VOICE_TTS_FIRST_CHUNK_TOKENS

        return token_count >= settings.VOICE_TTS_SUBSEQUENT_CHUNK_TOKENS

    async def _flush_buffer(self):
        chunk = self._buffer.strip()
        self._buffer = ""
        await self._cancel_first_chunk_timer()
        if not chunk:
            return
        self._first_chunk_sent = True
        await self.push_frame(TextFrame(text=chunk))

    async def _flush_first_chunk_on_timeout(self):
        try:
            await asyncio.sleep(settings.VOICE_TTS_FIRST_CHUNK_MAX_WAIT_MS / 1000)
            if (
                not self._first_chunk_sent
                and self._token_count() >= settings.VOICE_TTS_FIRST_CHUNK_MIN_TOKENS
            ):
                await self._flush_buffer()
        except asyncio.CancelledError:
            raise

    def _ensure_first_chunk_timer(self):
        if self._first_chunk_sent or self._first_chunk_timer is not None:
            return
        self._first_chunk_timer = asyncio.create_task(self._flush_first_chunk_on_timeout())

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, (TextFrame, LLMTextFrame)):
            text = getattr(frame, "text", "")
            if text:
                self._buffer += text
                self._ensure_first_chunk_timer()
                if self._should_flush_now():
                    await self._flush_buffer()
            return

        if isinstance(frame, LLMFullResponseEndFrame):
            await self._flush_buffer()
            self._first_chunk_sent = False
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, (InterruptionFrame, EndFrame)):
            await self._cancel_first_chunk_timer()
            self._buffer = ""
            self._first_chunk_sent = False
            await self.push_frame(frame, direction)
            return

        await self.push_frame(frame, direction)


class LowLatencyCartesiaTTSService(CartesiaTTSService):
    """Cartesia TTS service that disables server-side continuation buffering."""

    def __init__(self, *, max_buffer_delay_ms: int, **kwargs):
        self._max_buffer_delay_ms = max(0, max_buffer_delay_ms)
        kwargs.setdefault("text_aggregation_mode", TextAggregationMode.TOKEN)
        super().__init__(**kwargs)

    def _build_msg(
        self,
        text: str = "",
        continue_transcript: bool = True,
        add_timestamps: bool = True,
    ):
        payload = json.loads(super()._build_msg(text, continue_transcript, add_timestamps))
        payload["max_buffer_delay_ms"] = self._max_buffer_delay_ms
        return json.dumps(payload)


class FluxDeepgramSTTService(STTService):
    """Minimal Deepgram Flux websocket adapter for turn-based transcription."""

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        sample_rate: int = 16000,
        use_eager_eot: bool = True,
        eager_eot_threshold: float = 0.35,
        eot_threshold: float = 0.5,
        eot_timeout_ms: int = 700,
        **kwargs,
    ):
        super().__init__(
            sample_rate=sample_rate,
            ttfs_p99_latency=0.35,
            settings=STTSettings(model=model, language=None),
            **kwargs,
        )
        self._api_key = api_key
        self._model = model
        self._configured_sample_rate = sample_rate
        self._use_eager_eot = use_eager_eot
        self._eager_eot_threshold = eager_eot_threshold
        self._eot_threshold = eot_threshold
        self._eot_timeout_ms = eot_timeout_ms
        self._websocket = None
        self._receive_task: asyncio.Task | None = None
        self._flux_user_speaking = False
        self._last_interim_text = ""
        self._startup_error: Exception | None = None

    def _effective_sample_rate(self) -> int:
        return self.sample_rate or self._configured_sample_rate or 16000

    def _debug_connection_params(self) -> dict[str, Any]:
        params = {
            "encoding": "linear16",
            "sample_rate": self._effective_sample_rate(),
            "model": self._model,
            "eot_threshold": self._eot_threshold,
            "eot_timeout_ms": self._eot_timeout_ms,
        }
        if self._use_eager_eot:
            params["eager_eot_threshold"] = self._eager_eot_threshold
        return params

    def _build_uri(self) -> str:
        query = {key: str(value) for key, value in self._debug_connection_params().items()}
        return f"wss://api.deepgram.com/v2/listen?{urlencode(query)}"

    def _is_connected(self) -> bool:
        return self._websocket is not None and not getattr(self._websocket, "closed", True)

    def _extract_transcript(self, payload: dict[str, Any]) -> str:
        if isinstance(payload.get("transcript"), str):
            return payload["transcript"].strip()

        turn = payload.get("turn")
        if isinstance(turn, dict):
            if isinstance(turn.get("transcript"), str):
                return turn["transcript"].strip()
            if isinstance(turn.get("text"), str):
                return turn["text"].strip()

        alternatives = payload.get("alternatives")
        if isinstance(alternatives, list) and alternatives:
            first = alternatives[0]
            if isinstance(first, dict):
                if isinstance(first.get("transcript"), str):
                    return first["transcript"].strip()
                if isinstance(first.get("text"), str):
                    return first["text"].strip()

        return ""

    async def _emit_started_speaking(self):
        if self._flux_user_speaking:
            return
        self._flux_user_speaking = True
        await self.broadcast_frame(UserStartedSpeakingFrame)
        await self.broadcast_interruption()

    async def _emit_stopped_speaking(self, force: bool = False):
        if not self._flux_user_speaking and not force:
            return
        self._flux_user_speaking = False
        await self.broadcast_frame(UserStoppedSpeakingFrame)

    async def _connect(self):
        if self._is_connected():
            return
        if self._startup_error:
            raise RuntimeError("Deepgram Flux STT is unavailable for this session") from self._startup_error

        try:
            logger.debug(
                f"Connecting to Deepgram Flux with params: {self._debug_connection_params()}"
            )
            self._websocket = await websockets.connect(
                self._build_uri(),
                extra_headers={"Authorization": f"token {self._api_key}"},
                max_size=None,
                ping_interval=20,
                ping_timeout=20,
            )
            self._startup_error = None
            self._receive_task = asyncio.create_task(self._receive_loop())
            await self._call_event_handler("on_connected")
        except Exception as e:
            logger.error(f"Failed to connect to Deepgram Flux: {e}")
            self._websocket = None
            self._startup_error = e
            await self._call_event_handler("on_connection_error", e)
            raise

    async def _disconnect(self, graceful: bool):
        receive_task = self._receive_task
        self._receive_task = None

        try:
            if self._is_connected() and graceful:
                await self._websocket.send(json.dumps({"type": "CloseStream"}))
        except Exception as e:
            logger.debug(f"Deepgram Flux CloseStream failed: {e}")

        try:
            if self._websocket is not None:
                await self._websocket.close()
        finally:
            self._websocket = None

        if receive_task and not receive_task.done():
            receive_task.cancel()
            with suppress(asyncio.CancelledError):
                await receive_task

        await self._call_event_handler("on_disconnected")

    async def start(self, frame):
        await super().start(frame)
        await self._connect()

    async def stop(self, frame):
        await super().stop(frame)
        await self._disconnect(graceful=True)

    async def cancel(self, frame):
        await super().cancel(frame)
        await self._disconnect(graceful=False)

    async def probe_connection(self):
        await self._connect()
        await self._disconnect(graceful=False)

    async def run_stt(self, audio: bytes):
        if self._startup_error:
            raise RuntimeError("Deepgram Flux STT is unavailable for this session") from self._startup_error
        if not self._is_connected():
            await self._connect()

        try:
            await self._websocket.send(audio)
        except Exception as e:
            await self._call_event_handler("on_connection_error", e)
            raise
        yield None

    async def _handle_turn_info(self, payload: dict[str, Any]):
        event = str(payload.get("event") or "").strip()
        transcript = self._extract_transcript(payload)

        if event == "StartOfTurn":
            await self._emit_started_speaking()
            return

        if event == "EagerEndOfTurn":
            if self._use_eager_eot:
                await self._emit_stopped_speaking(force=True)
            return

        if event == "TurnResumed":
            await self._emit_started_speaking()
            return

        if event == "Update":
            if transcript and transcript != self._last_interim_text:
                self._last_interim_text = transcript
                await self.push_frame(
                    InterimTranscriptionFrame(
                        transcript,
                        self._user_id,
                        _utcnow_iso(),
                        None,
                        result=payload,
                    )
                )
            return

        if event == "EndOfTurn":
            await self._emit_stopped_speaking(force=True)
            self._last_interim_text = ""
            if transcript:
                await self.push_frame(
                    TranscriptionFrame(
                        transcript,
                        self._user_id,
                        _utcnow_iso(),
                        None,
                        result=payload,
                        finalized=True,
                    )
                )
                await self.stop_processing_metrics()

    async def _receive_loop(self):
        try:
            async for message in self._websocket:
                if isinstance(message, bytes):
                    continue

                payload = json.loads(message)
                response_type = payload.get("type")

                if response_type == "TurnInfo":
                    await self._handle_turn_info(payload)
                elif response_type == "Error":
                    await self._call_event_handler("on_connection_error", payload)
                elif response_type == "Warning":
                    logger.warning(f"Deepgram Flux warning: {payload}")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Deepgram Flux receive loop failed: {e}")
            await self._call_event_handler("on_connection_error", e)


class UserTurnGateProcessor(FrameProcessor):
    """Buffers final user transcripts and commits them after turn-end silence."""

    def __init__(
        self,
        session_id: str,
        on_auto_end: Callable[[dict[str, Any]], None],
        pipeline_task: PipelineTask | None = None,
        commit_silence_ms: int = USER_TURN_COMMIT_SILENCE_MS,
        fallback_commit_ms: int = USER_TURN_FALLBACK_COMMIT_MS,
    ):
        super().__init__()
        self._session_id = session_id
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
            await self._cancel_commit_task()
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, (UserStoppedSpeakingFrame, VADUserStoppedSpeakingFrame)):
            self._user_is_speaking = False
            self._schedule_commit(self._commit_silence_ms, "user_stopped_speaking")
            await self.push_frame(frame, direction)
            return

        if isinstance(frame, TranscriptionFrame):
            self._user_is_speaking = False
            self._pending_direction = direction
            if frame.text.strip():
                self._pending_segments.append(frame)
                self._schedule_commit(self._commit_silence_ms, "transcription_frame")
            return

        if isinstance(frame, InterimTranscriptionFrame):
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
        all_transcripts = (
            supabase_service.client.table("session_transcripts")
            .select("*")
            .eq("session_id", session_id)
            .order("timestamp_ms")
            .execute()
        )

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


async def create_session_stt_service(session_id: str) -> tuple[STTService, str]:
    if not _is_flux_model(settings.DEEPGRAM_STT_MODEL):
        fallback_stt = build_fallback_stt_service()
        logger.info(
            f"Using Deepgram streaming fallback STT for session {session_id} model={settings.DEEPGRAM_FALLBACK_STT_MODEL}"
        )
        return fallback_stt, "deepgram-streaming"

    flux_stt = FluxDeepgramSTTService(
        api_key=settings.DEEPGRAM_API_KEY,
        model=settings.DEEPGRAM_STT_MODEL,
        use_eager_eot=settings.VOICE_USE_EAGER_EOT,
        eager_eot_threshold=settings.VOICE_EAGER_EOT_THRESHOLD,
        eot_threshold=settings.VOICE_EOT_THRESHOLD,
        eot_timeout_ms=settings.VOICE_EOT_TIMEOUT_MS,
    )

    try:
        await flux_stt.probe_connection()
        logger.info(
            f"Using Deepgram Flux STT for session {session_id} model={settings.DEEPGRAM_STT_MODEL}"
        )
        return flux_stt, "flux"
    except Exception as e:
        if settings.DEEPGRAM_FLUX_REQUIRED:
            raise RuntimeError(
                f"Deepgram Flux is required but unavailable for session {session_id}"
            ) from e

        logger.warning(
            f"Deepgram Flux unavailable for session {session_id}; "
            f"falling back to {settings.DEEPGRAM_FALLBACK_STT_MODEL}: {e}"
        )
        fallback_stt = build_fallback_stt_service()
        return fallback_stt, "deepgram-streaming"


def _build_transport(
    *,
    livekit_url: str,
    bot_token: str,
    room_name: str,
) -> LiveKitTransport:
    params = LiveKitParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        audio_in_sample_rate=16000,
        audio_out_sample_rate=24000,
        audio_in_passthrough=True,
    )
    params.vad_analyzer = SileroVADAnalyzer(
        sample_rate=16000,
        params=VADParams(
            confidence=0.7,
            start_secs=0.2,
            stop_secs=0.2,
            min_volume=0.6,
        ),
    )

    return LiveKitTransport(
        url=livekit_url,
        token=bot_token,
        room_name=room_name,
        params=params,
    )


async def _flush_buffers(
    session_id: str,
    transcript_buffer: list[dict],
):
    if transcript_buffer:
        try:
            await supabase_service.save_transcript(session_id, transcript_buffer.copy())
            logger.debug(f"Flushed {len(transcript_buffer)} transcript entries")
            transcript_buffer.clear()
        except Exception as e:
            logger.error(f"Failed to save transcript: {e}")


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
    """Create and run the voice AI pipeline for a sales training session."""

    logger.info(f"Starting cascade pipeline for session {session_id} in room {room_name}")

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
    conversation_model = await resolve_conversation_model()
    transcript_buffer: list[dict] = []

    transport = _build_transport(
        livekit_url=livekit_url,
        bot_token=bot_token,
        room_name=room_name,
    )

    cartesia_voice_id = persona.get("cartesia_voice_id") or DEFAULT_CARTESIA_VOICE
    logger.info(f"Using Cartesia voice ID: {cartesia_voice_id}")

    stt, stt_mode = await create_session_stt_service(session_id)
    llm = build_conversation_llm(conversation_model)
    tts = LowLatencyCartesiaTTSService(
        api_key=settings.CARTESIA_API_KEY,
        voice_id=cartesia_voice_id,
        model=settings.CARTESIA_MODEL,
        sample_rate=24000,
        max_buffer_delay_ms=settings.CARTESIA_MAX_BUFFER_DELAY_MS,
    )

    context = OpenAILLMContext(
        messages=[{"role": "system", "content": system_prompt}],
    )
    context_aggregator = llm.create_context_aggregator(context)
    user_transcript_collector = UserTranscriptCollector(session_id, transcript_buffer)
    ai_response_collector = AIResponseCollector(session_id, transcript_buffer)
    clause_chunker = ClauseChunkingProcessor()
    number_normalizer = NumberNormalizerProcessor()
    context_manager = ConversationContextManager(context=context)
    turn_gate = UserTurnGateProcessor(
        session_id=session_id,
        on_auto_end=lambda reason: pipeline_result.update(
            {"auto_complete_session": True, "end_reason": reason}
        ),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_transcript_collector,
            turn_gate,
            context_aggregator.user(),
            llm,
            ai_response_collector,
            clause_chunker,
            number_normalizer,
            tts,
            transport.output(),
            context_aggregator.assistant(),
            context_manager,
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

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport_ref, participant: Any):
        participant_id = getattr(participant, "identity", participant)
        logger.info(f"User {participant_id} joined room {room_name}")
        greeting = (
            f"Hello! I'm {persona.get('name', 'your AI prospect')}. "
            "How can I help you today?"
        )
        await task.queue_frames([TTSSpeakFrame(text=greeting)])

    @transport.event_handler("on_participant_left")
    async def on_participant_left(transport_ref, participant_id: str, reason: str):
        logger.info(f"Participant {participant_id} left room {room_name}. Reason: {reason}")

    @stt.event_handler("on_connected")
    async def on_stt_connected(stt_ref, *args, **kwargs):
        logger.info(f"Deepgram STT connected for session {session_id} mode={stt_mode}")

    @stt.event_handler("on_connection_error")
    async def on_stt_connection_error(stt_ref, error, *args, **kwargs):
        logger.error(
            f"Deepgram STT connection error for session {session_id} mode={stt_mode}: "
            f"{error} ({type(error).__name__})"
        )

    async def flush_buffers():
        while True:
            await asyncio.sleep(TRANSCRIPT_FLUSH_INTERVAL_SECS)
            await _flush_buffers(session_id, transcript_buffer)

    flush_task = asyncio.create_task(flush_buffers())
    runner = PipelineRunner()

    try:
        logger.info(f"Pipeline running for session {session_id} model={conversation_model}")
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

        await _flush_buffers(session_id, transcript_buffer)

        analysis_task = asyncio.create_task(run_post_call_analysis(session_id, scenario, persona))
        analysis_task.add_done_callback(
            lambda task: logger.error(
                f"Background analysis task failed for session {session_id}: {task.exception()}"
            )
            if not task.cancelled() and task.exception()
            else None
        )

    return pipeline_result
