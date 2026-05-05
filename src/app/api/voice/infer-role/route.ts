import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPipecatServiceUrl } from "@/lib/pipecat";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipecatApiKey = process.env.PIPECAT_SERVICE_API_KEY;
  if (!pipecatApiKey) {
    return NextResponse.json({ error: "Voice service misconfigured" }, { status: 500 });
  }

  // Lazy cleanup: delete records older than 5 min (fire-and-forget)
  supabase.from("infer_role_calls")
    .delete()
    .eq("user_id", user.id)
    .lt("called_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

  // Rate limit: 10 calls per minute per user
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { count: recentCalls } = await supabase
    .from("infer_role_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("called_at", oneMinuteAgo);

  if ((recentCalls ?? 0) >= 10) {
    Sentry.logger.warn("voice/infer-role: rate limit exceeded", {
      userId: user.id,
      recentCallCount: recentCalls ?? 0,
    });
    const res = NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
    res.headers.set("Retry-After", "60");
    return res;
  }

  // Record this call
  await supabase.from("infer_role_calls").insert({ user_id: user.id });

  const body = await request.json();

  const pipecatUrl = getPipecatServiceUrl();

  try {
    const response = await fetch(`${pipecatUrl}/api/v1/infer-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pipecatApiKey}`,
      },
      body: JSON.stringify({
        what_you_sell: (body.whatYouSell || "").trim().slice(0, 500),
        target_audience: (body.targetAudience || "").trim().slice(0, 500),
        pitch_context: (body.pitchContext || "").trim().slice(0, 2000),
      }),
    });

    if (!response.ok) {
      Sentry.logger.warn("voice/infer-role: Pipecat returned error", {
        userId: user.id,
        pipecatStatus: response.status,
      });
      return NextResponse.json({ error: "Inference failed" }, { status: 502 });
    }

    const data = await response.json();
    Sentry.logger.info("voice/infer-role: inference succeeded", {
      userId: user.id,
      rolesCount: Array.isArray(data.roles) ? data.roles.length : 0,
    });
    return NextResponse.json({ roles: data.roles });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "voice/infer-role" } });
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
