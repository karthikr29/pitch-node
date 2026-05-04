import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from pipecat.frames.frames import EndFrame, InputAudioRawFrame, TranscriptionFrame
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frame_processor import FrameDirection
from pipecat.frames.frames import InterruptionFrame, LLMFullResponseEndFrame, LLMTextFrame, TextFrame

from app.config import Settings
from app.pipelines.sales_pipeline import (
    ClauseChunkingProcessor,
    ConversationContextManager,
    EphemeralVoiceProfile,
    FluxDeepgramSTTService,
    LowLatencyCartesiaTTSService,
    AIResponseCollector,
    TargetSpeakerGateProcessor,
    UserTurnGateProcessor,
    VoiceCalibrationProcessor,
    create_session_stt_service,
    detect_closing_intent,
    settings,
)
from app.services.xai_service import normalize_grok_model_name


def test_normalize_grok_model_name_maps_openrouter_aliases():
    assert normalize_grok_model_name("x-ai/grok-4.1-fast") == "grok-4-1-fast-reasoning"
    assert normalize_grok_model_name("grok-4.1") == "grok-4-1"
    assert normalize_grok_model_name("grok-4-1-fast-reasoning") == "grok-4-1-fast-reasoning"


def test_context_manager_prunes_history_and_inserts_summary(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_CONTEXT_MAX_TURNS", 2)

    context = OpenAILLMContext(
        messages=[
            {"role": "system", "content": "Base instructions"},
            {"role": "user", "content": "u1"},
            {"role": "assistant", "content": "a1"},
            {"role": "user", "content": "u2"},
            {"role": "assistant", "content": "a2"},
            {"role": "user", "content": "u3"},
            {"role": "assistant", "content": "a3"},
        ]
    )

    manager = ConversationContextManager(context=context)
    evicted = manager._prune_messages_locked()
    messages = context.get_messages()

    assert evicted == [
        {"role": "user", "content": "u1"},
        {"role": "assistant", "content": "a1"},
    ]
    assert messages[0] == {"role": "system", "content": "Base instructions"}
    assert messages[1]["role"] == "system"
    assert messages[1]["content"].startswith("[Conversation summary]")
    assert messages[2:] == [
        {"role": "user", "content": "u2"},
        {"role": "assistant", "content": "a2"},
        {"role": "user", "content": "u3"},
        {"role": "assistant", "content": "a3"},
    ]


def test_settings_reject_invalid_flux_eot_threshold(monkeypatch):
    monkeypatch.setenv("DEEPGRAM_STT_MODEL", "flux-general-en")
    monkeypatch.setenv("VOICE_EOT_THRESHOLD", "0.45")

    with pytest.raises(ValueError, match="VOICE_EOT_THRESHOLD"):
        Settings()


def test_settings_reject_eager_threshold_above_eot(monkeypatch):
    monkeypatch.setenv("DEEPGRAM_STT_MODEL", "flux-general-en")
    monkeypatch.setenv("VOICE_EOT_THRESHOLD", "0.5")
    monkeypatch.setenv("VOICE_EAGER_EOT_THRESHOLD", "0.7")

    with pytest.raises(ValueError, match="VOICE_EAGER_EOT_THRESHOLD"):
        Settings()


def test_flux_stt_service_initializes_complete_settings():
    service = FluxDeepgramSTTService(
        api_key="test-deepgram",
        model="flux-general-en",
        sample_rate=16000,
    )

    assert service._settings.model == "flux-general-en"
    assert service._settings.language is None


@pytest.mark.asyncio
async def test_flux_stt_service_does_not_reconnect_after_startup_failure(monkeypatch):
    service = FluxDeepgramSTTService(
        api_key="test-deepgram",
        model="flux-general-en",
        sample_rate=16000,
    )
    service._startup_error = RuntimeError("startup failed")
    service._connect = AsyncMock()

    with pytest.raises(RuntimeError, match="unavailable"):
        async for _ in service.run_stt(b"1234"):
            pass

    service._connect.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_session_stt_service_falls_back_when_flux_probe_fails(monkeypatch):
    sentinel_fallback = object()
    monkeypatch.setattr(settings, "DEEPGRAM_STT_MODEL", "flux-general-en")
    monkeypatch.setattr(settings, "DEEPGRAM_FLUX_REQUIRED", False)
    monkeypatch.setattr(
        "app.pipelines.sales_pipeline.build_fallback_stt_service",
        lambda: sentinel_fallback,
    )
    monkeypatch.setattr(
        FluxDeepgramSTTService,
        "probe_connection",
        AsyncMock(side_effect=RuntimeError("HTTP 400")),
    )

    stt, mode = await create_session_stt_service("session-1")

    assert stt is sentinel_fallback
    assert mode == "deepgram-streaming"


@pytest.mark.asyncio
async def test_create_session_stt_service_raises_when_flux_required(monkeypatch):
    monkeypatch.setattr(settings, "DEEPGRAM_STT_MODEL", "flux-general-en")
    monkeypatch.setattr(settings, "DEEPGRAM_FLUX_REQUIRED", True)
    monkeypatch.setattr(
        FluxDeepgramSTTService,
        "probe_connection",
        AsyncMock(side_effect=RuntimeError("HTTP 400")),
    )

    with pytest.raises(RuntimeError, match="required"):
        await create_session_stt_service("session-2")


@pytest.mark.asyncio
async def test_voice_calibration_consumes_initial_audio_and_marks_ready(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_CALIBRATION_NOISE_SECS", 0.01)
    monkeypatch.setattr(settings, "VOICE_CALIBRATION_VOICE_SECS", 0.2)
    monkeypatch.setattr(settings, "VOICE_CALIBRATION_MIN_VOICE_SNR_DB", 1.0)

    updates: list[dict] = []
    completed: list[str] = []
    profile = EphemeralVoiceProfile()
    processor = VoiceCalibrationProcessor(
        profile=profile,
        on_audio_guard_update=lambda update: updates.append(update),
        on_calibration_complete=lambda status: completed.append(status),
    )
    processor.push_frame = AsyncMock()

    await processor.process_frame(
        InputAudioRawFrame(audio=(b"\x01\x00" * 160), sample_rate=16000, num_channels=1),
        FrameDirection.DOWNSTREAM,
    )
    for _ in range(20):
        await processor.process_frame(
            InputAudioRawFrame(audio=(b"\xff\x3f" * 160), sample_rate=16000, num_channels=1),
            FrameDirection.DOWNSTREAM,
        )

    assert completed == ["ready"]
    assert profile.ready is True
    processor.push_frame.assert_not_called()
    assert updates[-1]["calibration"] == "ready"


@pytest.mark.asyncio
async def test_target_speaker_gate_drops_fan_like_low_snr_audio(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_AUDIO_GUARD_MIN_SNR_DB", 6.0)
    profile = EphemeralVoiceProfile()
    profile.add_noise_frame({"rms": 0.1, "peak": 0.1, "zcr": 0.02, "crest": 1.0})
    monkeypatch.setattr(
        "app.pipelines.sales_pipeline._audio_features",
        lambda audio: {"rms": 0.1, "peak": 0.1, "zcr": 0.02, "crest": 1.0},
    )

    updates: list[dict] = []
    processor = TargetSpeakerGateProcessor(
        profile=profile,
        on_audio_guard_update=lambda update: updates.append(update),
    )
    processor.push_frame = AsyncMock()

    await processor.process_frame(
        InputAudioRawFrame(audio=b"fan", sample_rate=16000, num_channels=1),
        FrameDirection.DOWNSTREAM,
    )

    processor.push_frame.assert_not_called()
    assert processor.stats["fan_drops"] == 1
    assert updates[-1]["activity"] == "background_noise"


@pytest.mark.asyncio
async def test_target_speaker_gate_drops_clear_background_speaker(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_AUDIO_GUARD_MIN_SNR_DB", 6.0)
    monkeypatch.setattr(settings, "VOICE_AUDIO_GUARD_REJECT_THRESHOLD", 0.8)
    profile = EphemeralVoiceProfile()
    profile.add_noise_frame({"rms": 0.01, "peak": 0.02, "zcr": 0.01, "crest": 2.0})
    for _ in range(12):
        profile.add_voice_frame({"rms": 0.2, "peak": 0.5, "zcr": 0.02, "crest": 2.5})
    monkeypatch.setattr(
        "app.pipelines.sales_pipeline._audio_features",
        lambda audio: {"rms": 0.2, "peak": 0.5, "zcr": 0.35, "crest": 2.5},
    )

    updates: list[dict] = []
    processor = TargetSpeakerGateProcessor(
        profile=profile,
        on_audio_guard_update=lambda update: updates.append(update),
    )
    processor.push_frame = AsyncMock()

    await processor.process_frame(
        InputAudioRawFrame(audio=b"other-speaker", sample_rate=16000, num_channels=1),
        FrameDirection.DOWNSTREAM,
    )

    processor.push_frame.assert_not_called()
    assert processor.stats["background_speech_drops"] == 1
    assert updates[-1]["activity"] == "background_speech"


@pytest.mark.asyncio
async def test_target_speaker_gate_allows_readable_uncertain_speech(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_AUDIO_GUARD_MIN_SNR_DB", 6.0)
    profile = EphemeralVoiceProfile()
    profile.add_noise_frame({"rms": 0.01, "peak": 0.02, "zcr": 0.01, "crest": 2.0})
    monkeypatch.setattr(
        "app.pipelines.sales_pipeline._audio_features",
        lambda audio: {"rms": 0.2, "peak": 0.4, "zcr": 0.08, "crest": 2.0},
    )

    updates: list[dict] = []
    pushed: list[object] = []
    processor = TargetSpeakerGateProcessor(
        profile=profile,
        on_audio_guard_update=lambda update: updates.append(update),
    )
    processor.push_frame = AsyncMock(side_effect=lambda frame, direction=None: pushed.append(frame))

    await processor.process_frame(
        InputAudioRawFrame(audio=b"speech", sample_rate=16000, num_channels=1),
        FrameDirection.DOWNSTREAM,
    )

    assert len(pushed) == 1
    assert processor.stats["uncertain_passes"] == 1
    assert updates[-1]["activity"] == "uncertain_speech"


@pytest.mark.asyncio
async def test_flux_eager_end_of_turn_is_deduped_against_final():
    service = FluxDeepgramSTTService(
        api_key="test-deepgram",
        model="flux-general-en",
        sample_rate=16000,
    )
    service._emit_stopped_speaking = AsyncMock()
    service.stop_processing_metrics = AsyncMock()
    pushed: list[object] = []
    service.push_frame = AsyncMock(side_effect=lambda frame, direction=None: pushed.append(frame))

    await service._handle_turn_info({"event": "EagerEndOfTurn", "transcript": "hello"})
    await service._handle_turn_info({"event": "EndOfTurn", "transcript": "hello"})

    transcriptions = [frame for frame in pushed if isinstance(frame, TranscriptionFrame)]
    assert len(transcriptions) == 1
    assert transcriptions[0].text == "hello"
    assert transcriptions[0].result["eager"] is True


@pytest.mark.asyncio
async def test_user_turn_gate_cancels_eager_transcript_on_interruption():
    processor = UserTurnGateProcessor("session-eager", on_auto_end=lambda reason: None)
    processor.push_frame = AsyncMock()

    await processor.process_frame(
        TranscriptionFrame(
            text="partial thought",
            user_id="user-1",
            timestamp="2026-03-09T00:00:00Z",
            language=None,
            result={"eager": True},
            finalized=False,
        ),
        FrameDirection.DOWNSTREAM,
    )
    await processor.process_frame(InterruptionFrame(), FrameDirection.DOWNSTREAM)
    await asyncio.sleep(0.2)

    pushed_transcriptions = [
        call.args[0]
        for call in processor.push_frame.await_args_list
        if isinstance(call.args[0], TranscriptionFrame)
    ]
    assert pushed_transcriptions == []
    await processor.cleanup()

@pytest.mark.asyncio
async def test_clause_chunker_flushes_on_punctuation():
    processor = ClauseChunkingProcessor()
    pushed: list[TextFrame] = []
    processor.push_frame = AsyncMock(side_effect=lambda frame, direction=None: pushed.append(frame))

    await processor.process_frame(LLMTextFrame(text="Hello there,"), FrameDirection.DOWNSTREAM)
    await processor.cleanup()

    assert [frame.text for frame in pushed if isinstance(frame, TextFrame)] == ["Hello there,"]


@pytest.mark.asyncio
async def test_clause_chunker_flushes_first_chunk_on_timeout(monkeypatch):
    monkeypatch.setattr(settings, "VOICE_TTS_FIRST_CHUNK_MAX_WAIT_MS", 10)
    monkeypatch.setattr(settings, "VOICE_TTS_FIRST_CHUNK_MIN_TOKENS", 4)

    processor = ClauseChunkingProcessor()
    pushed: list[TextFrame] = []
    processor.push_frame = AsyncMock(side_effect=lambda frame, direction=None: pushed.append(frame))

    await processor.process_frame(
        LLMTextFrame(text="this should flush soon"),
        FrameDirection.DOWNSTREAM,
    )
    await asyncio.sleep(0.03)
    await processor.cleanup()

    assert [frame.text for frame in pushed if isinstance(frame, TextFrame)] == [
        "this should flush soon"
    ]


@pytest.mark.asyncio
async def test_clause_chunker_flushes_remaining_text_on_response_end():
    processor = ClauseChunkingProcessor()
    pushed: list[object] = []
    processor.push_frame = AsyncMock(side_effect=lambda frame, direction=None: pushed.append(frame))

    await processor.process_frame(LLMTextFrame(text="plain text without punctuation"), FrameDirection.DOWNSTREAM)
    await processor.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
    await processor.cleanup()

    text_frames = [frame.text for frame in pushed if isinstance(frame, TextFrame)]
    assert text_frames == ["plain text without punctuation"]
    assert any(isinstance(frame, LLMFullResponseEndFrame) for frame in pushed)


@pytest.mark.asyncio
async def test_clause_chunker_clears_buffer_on_interruption():
    processor = ClauseChunkingProcessor()
    pushed: list[object] = []
    processor.push_frame = AsyncMock(side_effect=lambda frame, direction=None: pushed.append(frame))

    await processor.process_frame(LLMTextFrame(text="partial answer"), FrameDirection.DOWNSTREAM)
    await processor.process_frame(InterruptionFrame(), FrameDirection.DOWNSTREAM)
    await processor.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)
    await processor.cleanup()

    assert not [frame for frame in pushed if isinstance(frame, TextFrame)]
    assert any(isinstance(frame, InterruptionFrame) for frame in pushed)


def test_detect_closing_intent_matches_standalone_goodbye():
    result = detect_closing_intent("Goodbye, talk soon.", "ai")

    assert result == {
        "should_end": True,
        "reason_code": "closing_goodbye",
        "speaker": "ai",
    }


def test_detect_closing_intent_matches_explicit_end_call():
    result = detect_closing_intent("Please end the call", "user")

    assert result == {
        "should_end": True,
        "reason_code": "explicit_end_call",
        "speaker": "user",
    }


def test_detect_closing_intent_ignores_non_closing_goodbye_mentions():
    result = detect_closing_intent("I do not want to say bye to this deal.", "user")

    assert result == {
        "should_end": False,
        "reason_code": "",
        "speaker": "user",
    }


@pytest.mark.asyncio
async def test_ai_response_collector_requests_auto_end_for_closing_response():
    reasons: list[dict] = []
    collector = AIResponseCollector(
        "session-1",
        [],
        on_auto_end=lambda reason: reasons.append(reason),
    )
    task = SimpleNamespace(queue_frames=AsyncMock())
    collector.set_pipeline_task(task)
    collector.push_frame = AsyncMock()

    await collector.process_frame(LLMTextFrame(text="Goodbye, talk soon."), FrameDirection.DOWNSTREAM)
    await collector.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)

    assert reasons == [
        {
            "type": "auto_end",
            "speaker": "ai",
            "reasonCode": "closing_goodbye",
            "trigger": "ai_full_response_end",
        }
    ]
    queued_frames = task.queue_frames.await_args.args[0]
    assert len(queued_frames) == 1
    assert isinstance(queued_frames[0], EndFrame)
    await collector.cleanup()


@pytest.mark.asyncio
async def test_ai_response_collector_ignores_non_closing_goodbye_mentions():
    reasons: list[dict] = []
    collector = AIResponseCollector(
        "session-2",
        [],
        on_auto_end=lambda reason: reasons.append(reason),
    )
    task = SimpleNamespace(queue_frames=AsyncMock())
    collector.set_pipeline_task(task)
    collector.push_frame = AsyncMock()

    await collector.process_frame(
        LLMTextFrame(text="You do not need to say goodbye to churn anymore."),
        FrameDirection.DOWNSTREAM,
    )
    await collector.process_frame(LLMFullResponseEndFrame(), FrameDirection.DOWNSTREAM)

    assert reasons == []
    task.queue_frames.assert_not_awaited()
    await collector.cleanup()


@pytest.mark.asyncio
async def test_user_turn_gate_queues_farewell_and_endframe_for_goodbye():
    reasons: list[dict] = []
    processor = UserTurnGateProcessor("session-3", on_auto_end=lambda reason: reasons.append(reason))
    task = SimpleNamespace(queue_frames=AsyncMock())
    processor.set_pipeline_task(task)
    processor.push_frame = AsyncMock()

    await processor.process_frame(
        TranscriptionFrame(
            text="bye",
            user_id="user-1",
            timestamp="2026-03-09T00:00:00Z",
            language=None,
            result={},
            finalized=True,
        ),
        FrameDirection.DOWNSTREAM,
    )
    await asyncio.sleep(0)
    await asyncio.sleep(0)

    assert reasons == [
        {
            "type": "auto_end",
            "speaker": "user",
            "reasonCode": "closing_goodbye",
            "trigger": "transcription_frame",
        }
    ]
    queued_frames = task.queue_frames.await_args.args[0]
    assert len(queued_frames) == 2
    assert queued_frames[0].text == "Understood. I'll let you go now. Goodbye."
    assert isinstance(queued_frames[1], EndFrame)
    await processor.cleanup()


def test_low_latency_cartesia_tts_builds_zero_buffer_payload():
    service = LowLatencyCartesiaTTSService(
        api_key="test-cartesia",
        voice_id="voice-123",
        model="sonic-3",
        sample_rate=24000,
        max_buffer_delay_ms=0,
    )

    payload = json.loads(service._build_msg("hello", continue_transcript=True, add_timestamps=True))

    assert payload["transcript"] == "hello"
    assert payload["continue"] is True
    assert payload["model_id"] == "sonic-3"
    assert payload["voice"]["id"] == "voice-123"
    assert payload["max_buffer_delay_ms"] == 0
