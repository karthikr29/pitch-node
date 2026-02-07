import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await request.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  // Verify session belongs to user
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Call Pipecat backend to end session
  try {
    const pipecatUrl = process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";
    await fetch(`${pipecatUrl}/api/v1/sessions/${sessionId}/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PIPECAT_SERVICE_API_KEY}`,
      },
    });
  } catch {
    // Pipeline may have already ended
  }

  const endedAt = new Date().toISOString();
  const durationSeconds = session.started_at
    ? Math.round((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000)
    : 0;

  await supabase
    .from("sessions")
    .update({ status: "completed", ended_at: endedAt, duration_seconds: durationSeconds })
    .eq("id", sessionId);

  return NextResponse.json({ sessionId, duration: durationSeconds });
}
