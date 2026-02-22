import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const pipecatUrl = process.env.PIPECAT_SERVICE_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${pipecatUrl}/api/v1/infer-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PIPECAT_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        what_you_sell: body.whatYouSell || "",
        target_audience: body.targetAudience || "",
        pitch_context: body.pitchContext || "",
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Inference failed" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ roles: data.roles });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
