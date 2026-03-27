import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const callType = request.nextUrl.searchParams.get("call_type");
    const difficulty = request.nextUrl.searchParams.get("difficulty");

    let query = supabase.from("scenarios").select("*").order("created_at", { ascending: true });
    if (callType) query = query.eq("call_type", callType);
    if (difficulty) query = query.eq("difficulty", difficulty);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const scenarios = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      callType: row.call_type,
      difficulty: row.difficulty,
    }));
    return NextResponse.json(scenarios);
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "scenarios" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
