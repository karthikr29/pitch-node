import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DependencyStatus = "ok" | "error";

interface HealthResponseBody {
  status: "ok" | "degraded";
  db: DependencyStatus;
  voice: DependencyStatus;
  timestamp: string;
}

function buildResponse(body: HealthResponseBody, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

async function checkDatabase() {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("scenarios")
    .select("id")
    .limit(1);

  if (error) {
    throw error;
  }
}

async function checkVoiceService() {
  const pipecatServiceUrl = process.env.PIPECAT_SERVICE_URL;

  if (!pipecatServiceUrl) {
    throw new Error("PIPECAT_SERVICE_URL is required for voice health checks");
  }

  const healthUrl = new URL("/health", pipecatServiceUrl).toString();
  const response = await fetch(healthUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Voice service health check returned ${response.status}`);
  }

  const payload = await response.json() as { status?: unknown };
  if (payload.status !== "ok") {
    throw new Error("Voice service health response was not ok");
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const [dbResult, voiceResult] = await Promise.allSettled([
      checkDatabase(),
      checkVoiceService(),
    ]);

    const body: HealthResponseBody = {
      status: dbResult.status === "fulfilled" && voiceResult.status === "fulfilled" ? "ok" : "degraded",
      db: dbResult.status === "fulfilled" ? "ok" : "error",
      voice: voiceResult.status === "fulfilled" ? "ok" : "error",
      timestamp,
    };

    if (body.status === "degraded") {
      Sentry.logger.warn("health: degraded", {
        dbStatus: body.db,
        voiceStatus: body.voice,
      });
    }

    return buildResponse(body, body.status === "ok" ? 200 : 503);
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "health" } });

    return buildResponse(
      {
        status: "degraded",
        db: "error",
        voice: "error",
        timestamp,
      },
      503
    );
  }
}
