import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildPitchContextFromBriefing,
  validatePitchBriefing,
} from "@/lib/validators";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipecatApiKey = process.env.PIPECAT_SERVICE_API_KEY;
  if (!pipecatApiKey) {
    return NextResponse.json({ error: "Voice service misconfigured" }, { status: 500 });
  }

  const { scenarioId, personaId, pitchContext, pitchBriefing, inferredRole } = await request.json();
  if (!scenarioId || !personaId) {
    return NextResponse.json({ error: "scenarioId and personaId are required" }, { status: 400 });
  }

  // Enforce max 1 active session per user at any time
  const { data: existingSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["connecting", "active"])
    .limit(1)
    .maybeSingle();

  if (existingSession) {
    Sentry.logger.warn("voice/create-room: active session conflict", {
      userId: user.id,
      existingSessionId: existingSession.id,
    });
    return NextResponse.json(
      { error: "A session is already in progress.", sessionId: existingSession.id },
      { status: 409 }
    );
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
      inferred_role: typeof inferredRole === "string" && inferredRole.trim()
        ? inferredRole.trim().slice(0, 150)
        : null,
    })
    .select()
    .single();

  if (sessionError) {
    // 23505 = unique_violation — DB-level race-condition backstop for the active-session index
    if ((sessionError as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "A session is already in progress." }, { status: 409 });
    }
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  Sentry.logger.info("voice/create-room: session created, calling Pipecat", {
    userId: user.id,
    sessionId: session.id,
    scenarioId,
    personaId,
    callType: scenario.call_type,
  });

  // Call Pipecat backend to create room and start pipeline
  try {
    const pipecatUrl = process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";
    const response = await fetch(`${pipecatUrl}/api/v1/sessions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pipecatApiKey}`,
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
      Sentry.logger.warn("voice/create-room: Pipecat returned error, rolling back session", {
        userId: user.id,
        sessionId: session.id,
        pipecatStatus: response.status,
      });
      await supabase.from("sessions").delete().eq("id", session.id);
      return NextResponse.json({ error: "Failed to start voice pipeline" }, { status: 502 });
    }

    const pipecatData = await response.json();

    Sentry.logger.info("voice/create-room: room ready", {
      userId: user.id,
      sessionId: session.id,
      roomName: session.livekit_room_name,
    });
    return NextResponse.json({
      sessionId: session.id,
      token: pipecatData.token,
      roomName: session.livekit_room_name,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "voice/create-room" }, extra: { sessionId: session.id } });
    await supabase.from("sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: "Voice pipeline service unavailable" }, { status: 503 });
  }
}
