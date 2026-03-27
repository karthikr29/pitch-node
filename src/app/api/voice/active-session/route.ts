import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["connecting", "active"])
      .limit(1)
      .maybeSingle();

    if (data) {
      Sentry.logger.debug("voice/active-session: found active session", {
        userId: user.id,
        sessionId: data.id,
        status: data.status,
      });
      return NextResponse.json({ hasActiveSession: true, sessionId: data.id, status: data.status });
    }
    return NextResponse.json({ hasActiveSession: false });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "voice/active-session" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
