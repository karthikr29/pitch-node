import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeConnectedAt(value: unknown) {
  if (typeof value !== "string") return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, connectedAt } = await request.json();
  const normalizedConnectedAt = normalizeConnectedAt(connectedAt);

  if (!sessionId || !normalizedConnectedAt) {
    return NextResponse.json(
      { error: "sessionId and a valid connectedAt are required" },
      { status: 400 }
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, started_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.started_at) {
    return NextResponse.json({
      sessionId,
      startedAt: session.started_at,
      alreadyStarted: true,
    });
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      status: "active",
      started_at: normalizedConnectedAt,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .is("started_at", null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: updatedSession, error: updatedSessionError } = await supabase
    .from("sessions")
    .select("started_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (updatedSessionError || !updatedSession?.started_at) {
    return NextResponse.json({ error: "Failed to persist session start" }, { status: 500 });
  }

  return NextResponse.json({
    sessionId,
    startedAt: updatedSession.started_at,
    alreadyStarted: updatedSession.started_at !== normalizedConnectedAt,
  });
}
