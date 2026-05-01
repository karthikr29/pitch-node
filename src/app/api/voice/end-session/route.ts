import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeSessionWithCredits } from "@/lib/credits";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipecatApiKey = process.env.PIPECAT_SERVICE_API_KEY;
  if (!pipecatApiKey) {
    return NextResponse.json({ error: "Voice service misconfigured" }, { status: 500 });
  }

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

  if (session.status === "completed" && session.credits_charged_seconds !== null) {
    Sentry.logger.debug("voice/end-session: already completed", {
      userId: user.id,
      sessionId,
      durationSeconds: session.duration_seconds ?? 0,
      creditsChargedSeconds: session.credits_charged_seconds ?? 0,
    });
    return NextResponse.json({
      sessionId,
      duration: session.duration_seconds ?? 0,
      creditsCharged: session.credits_charged_seconds ?? 0,
      alreadyCharged: true,
    });
  }

  if (session.status !== "completed") {
    // Call Pipecat backend to end session
    try {
      const pipecatUrl = process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      try {
        await fetch(`${pipecatUrl}/api/v1/sessions/${sessionId}/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${pipecatApiKey}`,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Pipeline may have already ended or timed out during shutdown.
      console.warn("[voice/end-session] Non-fatal Pipecat shutdown issue:", error);
      Sentry.captureException(error, { level: "warning", tags: { route: "voice/end-session" } });
    }
  }

  const endedAt = new Date().toISOString();
  const admin = createAdminClient();
  const completed = await completeSessionWithCredits(admin, sessionId, endedAt);

  Sentry.logger.info("voice/end-session: session marked completed", {
    userId: user.id,
    sessionId,
    durationSeconds: completed.durationSeconds,
    creditsChargedSeconds: completed.creditsChargedSeconds,
    alreadyCharged: completed.alreadyCharged,
  });
  return NextResponse.json({
    sessionId,
    duration: completed.durationSeconds,
    creditsCharged: completed.creditsChargedSeconds,
    alreadyCharged: completed.alreadyCharged,
  });
}
