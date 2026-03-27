import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

function buildUnknownState(sessionId: string) {
  return {
    sessionId,
    phase: "unknown",
    autoEndRequested: false,
    endReason: null,
    requestedAt: null,
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const pipecatUrl = process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";
    const response = await fetch(`${pipecatUrl}/api/v1/sessions/${sessionId}/state`, {
      headers: {
        "Authorization": `Bearer ${process.env.PIPECAT_SERVICE_API_KEY}`,
      },
      cache: "no-store",
    });

    if (response.status === 404) {
      Sentry.logger.debug("voice/session-state: Pipecat has no state for session (pipeline may not be running)", {
        sessionId,
        userId: user.id,
      });
      return NextResponse.json(buildUnknownState(sessionId));
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch voice session state" }, { status: 502 });
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "voice/session-state" } });
    return NextResponse.json({ error: "Voice session state unavailable" }, { status: 503 });
  }
}
