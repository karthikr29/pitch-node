import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawData, error } = await supabase
    .from("sessions")
    .select("*, scenarios(*), personas(*), session_transcripts(*), session_analytics(*)")
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

  const session = {
    id: data.id,
    createdAt: data.created_at,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    durationSeconds: data.duration_seconds,
    status: data.status,
    livekitRoomName: data.livekit_room_name,
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
    analytics: analyticsObj ? {
      overallScore: analyticsObj.overall_score,
      scores: analyticsObj.scores,
      letterGrade: analyticsObj.letter_grade,
      aiSummary: analyticsObj.ai_summary,
      highlightMoments: analyticsObj.highlight_moments,
      improvementSuggestions: analyticsObj.improvement_suggestions,
    } : null,
    transcripts: transcripts.map((t: Record<string, unknown>) => ({
      id: t.id,
      speaker: t.speaker,
      content: t.content,
      timestampMs: t.timestamp_ms,
      confidence: t.confidence,
    })),
  };

  return NextResponse.json(session);
}
