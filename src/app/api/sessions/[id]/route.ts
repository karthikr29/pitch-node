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
  const transcripts = ((data.session_transcripts as Record<string, unknown>[] | null) ?? [])
    .sort((a, b) => ((a.timestamp_ms as number) ?? 0) - ((b.timestamp_ms as number) ?? 0));

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
  };

  return NextResponse.json(session);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
