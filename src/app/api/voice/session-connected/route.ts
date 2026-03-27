import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
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
      Sentry.logger.debug("voice/session-connected: already started (idempotent)", {
        userId: user.id,
        sessionId,
      });
      return NextResponse.json({
        sessionId,
        startedAt: session.started_at,
        alreadyStarted: true,
      });
    }

    const serverStartedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        status: "active",
        started_at: serverStartedAt,
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

    Sentry.logger.info("voice/session-connected: session transitioned to active", {
      userId: user.id,
      sessionId,
      startedAt: updatedSession.started_at,
    });
    return NextResponse.json({
      sessionId,
      startedAt: updatedSession.started_at,
      alreadyStarted: false,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "voice/session-connected" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
