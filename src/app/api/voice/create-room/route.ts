import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildPitchContextFromBriefing,
  validatePitchBriefing,
} from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scenarioId, personaId, pitchContext, pitchBriefing, inferredRole } = await request.json();
  if (!scenarioId || !personaId) {
    return NextResponse.json({ error: "scenarioId and personaId are required" }, { status: 400 });
  }

  // Rate limit: max 30 sessions per user per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);
  if ((count ?? 0) >= 30) {
    return NextResponse.json({ error: "Rate limit exceeded. Max 30 sessions per hour." }, { status: 429 });
  }

  const { data: scenario, error: scenarioError } = await supabase
    .from("scenarios")
    .select("id, call_type")
    .eq("id", scenarioId)
    .single();

  if (scenarioError || !scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const isPitchScenario = scenario.call_type === "pitch";
  let resolvedPitchContext = typeof pitchContext === "string" ? pitchContext.trim() : "";
  let resolvedPitchBriefing: Record<string, unknown> | null = null;

  if (isPitchScenario) {
    const briefingValidation = validatePitchBriefing(pitchBriefing);
    if (!briefingValidation.valid || !briefingValidation.value) {
      return NextResponse.json(
        {
          error: "Invalid pitchBriefing for pitch scenario",
          details: briefingValidation.errors,
        },
        { status: 400 }
      );
    }

    resolvedPitchBriefing = briefingValidation.value as unknown as Record<string, unknown>;
    resolvedPitchContext = buildPitchContextFromBriefing(briefingValidation.value);
  }

  // Create session in DB
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenarioId,
      persona_id: personaId,
      status: "connecting",
      pitch_context: resolvedPitchContext || null,
      pitch_briefing: resolvedPitchBriefing,
      livekit_room_name: `session-${crypto.randomUUID()}`,
    })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  // Call Pipecat backend to create room and start pipeline
  try {
    const pipecatUrl = process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";
    const response = await fetch(`${pipecatUrl}/api/v1/sessions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PIPECAT_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        session_id: session.id,
        room_name: session.livekit_room_name,
        scenario_id: scenarioId,
        persona_id: personaId,
        user_id: user.id,
        pitch_context: resolvedPitchContext || "",
        pitch_briefing: resolvedPitchBriefing || undefined,
        inferred_role: typeof inferredRole === "string" && inferredRole.trim() ? inferredRole.trim().slice(0, 150) : undefined,
      }),
    });

    if (!response.ok) {
      await supabase.from("sessions").delete().eq("id", session.id);
      return NextResponse.json({ error: "Failed to start voice pipeline" }, { status: 502 });
    }

    const pipecatData = await response.json();

    return NextResponse.json({
      sessionId: session.id,
      token: pipecatData.token,
      roomName: session.livekit_room_name,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch {
    await supabase.from("sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: "Voice pipeline service unavailable" }, { status: 503 });
  }
}
