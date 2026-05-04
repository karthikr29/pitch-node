import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { createClient } from "@/lib/supabase/server";

const ENROLL_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ENROLL_MAX_PER_WINDOW = 10;
const MAX_AUDIO_BASE64_BYTES = 600_000; // ~400 KB raw + base64 overhead

interface EnrollRequestBody {
  audio_b64?: string;
  sample_rate?: number;
  duration_ms?: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pipecatApiKey = process.env.PIPECAT_SERVICE_API_KEY;
  if (!pipecatApiKey) {
    return NextResponse.json(
      { error: "Voice service misconfigured" },
      { status: 500 }
    );
  }

  // Lazy cleanup of stale rows (fire and forget). Errors here are non-fatal
  // — the rate-limit query below still works on a stale table.
  void supabase
    .from("voiceprint_enroll_calls")
    .delete()
    .eq("user_id", user.id)
    .lt(
      "called_at",
      new Date(Date.now() - ENROLL_WINDOW_MS).toISOString()
    );

  const windowStart = new Date(Date.now() - ENROLL_WINDOW_MS).toISOString();
  const { count: recentCalls, error: countError } = await supabase
    .from("voiceprint_enroll_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("called_at", windowStart);

  // If the table doesn't exist yet (pre-migration) treat as 0 — the route
  // remains usable but unrate-limited until the migration is applied.
  if (countError && countError.code !== "42P01") {
    Sentry.logger.warn("voice/voiceprint: rate-limit query failed", {
      userId: user.id,
      code: countError.code,
      message: countError.message,
    });
  }

  if ((recentCalls ?? 0) >= ENROLL_MAX_PER_WINDOW) {
    Sentry.logger.warn("voice/voiceprint: rate limit exceeded", {
      userId: user.id,
      recentCalls,
    });
    const res = NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
    res.headers.set("Retry-After", "300");
    return res;
  }

  // Best-effort record. If the table is missing this is a no-op.
  void supabase.from("voiceprint_enroll_calls").insert({ user_id: user.id });

  let body: EnrollRequestBody;
  try {
    body = (await request.json()) as EnrollRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const audioB64 = typeof body.audio_b64 === "string" ? body.audio_b64 : "";
  if (!audioB64) {
    return NextResponse.json(
      { error: "audio_b64 is required" },
      { status: 400 }
    );
  }
  if (audioB64.length > MAX_AUDIO_BASE64_BYTES) {
    return NextResponse.json(
      { error: "audio payload too large" },
      { status: 413 }
    );
  }

  const sampleRate =
    typeof body.sample_rate === "number" && Number.isFinite(body.sample_rate)
      ? Math.round(body.sample_rate)
      : 16000;
  if (sampleRate < 8000 || sampleRate > 48000) {
    return NextResponse.json(
      { error: "sample_rate must be between 8000 and 48000" },
      { status: 400 }
    );
  }

  const durationMs =
    typeof body.duration_ms === "number" && Number.isFinite(body.duration_ms)
      ? Math.round(body.duration_ms)
      : undefined;

  const pipecatUrl =
    process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${pipecatUrl}/api/v1/voiceprint/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pipecatApiKey}`,
      },
      body: JSON.stringify({
        audio_b64: audioB64,
        sample_rate: sampleRate,
        duration_ms: durationMs,
      }),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      // Surface the Pipecat error code to the client so the calibration UI
      // can show the right per-failure message (TOO_QUIET / TOO_NOISY / ...).
      const detail =
        data && typeof data === "object" && "detail" in data
          ? (data as { detail: unknown }).detail
          : null;
      Sentry.logger.info("voice/voiceprint: enroll rejected", {
        userId: user.id,
        pipecatStatus: response.status,
        detail,
      });
      return NextResponse.json(
        { error: "enroll_failed", status: response.status, detail },
        { status: response.status }
      );
    }

    Sentry.logger.info("voice/voiceprint: enroll ok", {
      userId: user.id,
      durationMs,
      sampleRate,
    });
    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "voice/voiceprint" },
      extra: { userId: user.id },
    });
    return NextResponse.json(
      { error: "Voice enrollment service unavailable" },
      { status: 503 }
    );
  }
}
