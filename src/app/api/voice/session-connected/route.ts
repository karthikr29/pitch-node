import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

async function notifyPipecatConnected(
  sessionId: string,
  maxDurationSeconds: unknown,
  userId: string
): Promise<boolean> {
  const pipecatApiKey = process.env.PIPECAT_SERVICE_API_KEY;
  if (!pipecatApiKey || typeof maxDurationSeconds !== "number" || maxDurationSeconds <= 0) {
    return true;
  }

  try {
    const pipecatUrl = process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";
    const response = await fetch(`${pipecatUrl}/api/v1/sessions/${sessionId}/connected`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pipecatApiKey}`,
      },
      body: JSON.stringify({ max_duration_seconds: maxDurationSeconds }),
    });

    if (!response.ok) {
      Sentry.logger.warn("voice/session-connected: Pipecat connected signal failed", {
        userId,
        sessionId,
        pipecatStatus: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    Sentry.captureException(error, {
      level: "warning",
      tags: { route: "voice/session-connected", phase: "pipecat-connected-signal" },
      extra: { sessionId },
    });
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, maxDurationSeconds } = await request.json();

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
      const pipecatNotified = await notifyPipecatConnected(sessionId, maxDurationSeconds, user.id);
      if (!pipecatNotified) {
        Sentry.logger.warn("voice/session-connected: time-limit notification failed (alreadyStarted), continuing without it", {
          userId: user.id,
          sessionId,
        });
      }
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

    const pipecatNotified = await notifyPipecatConnected(sessionId, maxDurationSeconds, user.id);
    if (!pipecatNotified) {
      Sentry.logger.warn("voice/session-connected: time-limit notification failed, continuing without it", {
        userId: user.id,
        sessionId,
      });
    }

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
