import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RecordingStatus = "none" | "processing" | "ready" | "failed" | "expired";

interface RecordingPayload {
  status: RecordingStatus;
  url: string | null;
  durationSeconds: number | null;
  expiresAt: string | null;
  error: string | null;
}

const RECORDING_SIGNED_URL_TTL_SECONDS = 600;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function parseNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function mapRecording(
  supabase: SupabaseClient,
  rawRecording: Record<string, unknown> | null,
): Promise<RecordingPayload> {
  if (!rawRecording) {
    return {
      status: "none",
      url: null,
      durationSeconds: null,
      expiresAt: null,
      error: null,
    };
  }

  const statusRaw = parseString(rawRecording.status) ?? "";
  const expiresAt = parseString(rawRecording.expires_at);
  const durationSeconds = parseNumber(rawRecording.duration_seconds);
  const error = parseString(rawRecording.error_message);

  if (statusRaw === "recording" || statusRaw === "processing") {
    return {
      status: "processing",
      url: null,
      durationSeconds,
      expiresAt,
      error,
    };
  }

  if (statusRaw === "expired") {
    return {
      status: "expired",
      url: null,
      durationSeconds,
      expiresAt,
      error,
    };
  }

  if (statusRaw === "failed") {
    return {
      status: "failed",
      url: null,
      durationSeconds,
      expiresAt,
      error: error ?? "Recording failed to process.",
    };
  }

  if (statusRaw !== "ready") {
    return {
      status: "failed",
      url: null,
      durationSeconds,
      expiresAt,
      error: error ?? "Unknown recording state.",
    };
  }

  if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) <= Date.now()) {
    return {
      status: "expired",
      url: null,
      durationSeconds,
      expiresAt,
      error,
    };
  }

  const storageBucket = parseString(rawRecording.storage_bucket);
  const storagePath = parseString(rawRecording.storage_path);
  if (!storageBucket || !storagePath) {
    return {
      status: "failed",
      url: null,
      durationSeconds,
      expiresAt,
      error: "Recording metadata is incomplete.",
    };
  }

  const { data, error: signedUrlError } = await supabase
    .storage
    .from(storageBucket)
    .createSignedUrl(storagePath, RECORDING_SIGNED_URL_TTL_SECONDS);

  if (signedUrlError || !data?.signedUrl) {
    return {
      status: "failed",
      url: null,
      durationSeconds,
      expiresAt,
      error: signedUrlError?.message ?? "Unable to generate playback URL.",
    };
  }

  return {
    status: "ready",
    url: data.signedUrl,
    durationSeconds,
    expiresAt,
    error: null,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawData, error } = await supabase
    .from("sessions")
    .select("*, scenarios(*), personas(*), session_transcripts(*), session_analytics(*), session_recordings(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Cast to Record to avoid Supabase type inference issues with complex joins
  const data = rawData as Record<string, unknown>;
  const scenario = data.scenarios as Record<string, unknown> | null;
  const persona = data.personas as Record<string, unknown> | null;
  const analytics = data.session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
  const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;
  const transcripts = (data.session_transcripts as Record<string, unknown>[] | null) ?? [];
  const recordingRaw = data.session_recordings as Record<string, unknown> | Record<string, unknown>[] | null;
  const recordingObj = Array.isArray(recordingRaw) ? (recordingRaw[0] ?? null) : recordingRaw;
  const recording = await mapRecording(supabase, recordingObj);

  const session = {
    id: data.id,
    createdAt: data.created_at,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    durationSeconds: data.duration_seconds,
    status: data.status,
    livekitRoomName: data.livekit_room_name,
    pitchBriefing: data.pitch_briefing ?? null,
    scenario: scenario ? {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      callType: scenario.call_type,
      difficulty: scenario.difficulty,
      contextBriefing: scenario.context_briefing,
      objectives: scenario.objectives,
      evaluationCriteria: scenario.evaluation_criteria,
    } : null,
    persona: persona ? {
      id: persona.id,
      name: persona.name,
      emoji: persona.emoji,
      title: persona.title,
      description: persona.description,
      personaType: persona.persona_type,
    } : null,
    analytics: analyticsObj ? (() => {
      const scoresObj = analyticsObj.scores as Record<string, number> | null;
      return {
        overallScore: analyticsObj.overall_score,
        letterGrade: analyticsObj.letter_grade,
        aiSummary: analyticsObj.ai_summary,
        highlightMoments: analyticsObj.highlight_moments,
        improvementSuggestions: analyticsObj.improvement_suggestions,
        metrics: {
          activeListening:   scoresObj?.active_listening   ?? 0,
          objectionHandling: scoresObj?.objection_handling ?? 0,
          closing:           scoresObj?.closing_technique  ?? 0,
          rapport:           scoresObj?.rapport_building   ?? 0,
        },
      };
    })() : null,
    transcripts: transcripts.map((t: Record<string, unknown>) => ({
      id: t.id,
      speaker: t.speaker,
      content: t.content,
      timestampMs: t.timestamp_ms,
      confidence: t.confidence,
    })),
    recording,
  };

  return NextResponse.json(session);
}
