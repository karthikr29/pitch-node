import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scenarioId, personaId } = await request.json();
  if (!scenarioId || !personaId) {
    return NextResponse.json({ error: "scenarioId and personaId are required" }, { status: 400 });
  }

  // Create session in DB
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenarioId,
      persona_id: personaId,
      status: "connecting",
      livekit_room_name: `session-${Date.now()}-${user.id.slice(0, 8)}`,
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
      }),
    });

    if (!response.ok) {
      await supabase.from("sessions").update({ status: "error" }).eq("id", session.id);
      return NextResponse.json({ error: "Failed to start voice pipeline" }, { status: 502 });
    }

    const pipecatData = await response.json();

    await supabase.from("sessions").update({ status: "active", started_at: new Date().toISOString() }).eq("id", session.id);

    return NextResponse.json({
      sessionId: session.id,
      token: pipecatData.token,
      roomName: session.livekit_room_name,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    await supabase.from("sessions").update({ status: "error" }).eq("id", session.id);
    return NextResponse.json({ error: "Voice pipeline service unavailable" }, { status: 503 });
  }
}
