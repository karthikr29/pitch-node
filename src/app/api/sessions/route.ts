import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");
  const callType = request.nextUrl.searchParams.get("callType") || request.nextUrl.searchParams.get("call_type");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("sessions")
    .select("*, scenarios(title, call_type, difficulty), personas(name, emoji), session_analytics(scores, overall_score)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (callType) query = query.eq("scenarios.call_type", callType);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sessions = (data || []).map((row: Record<string, unknown>) => {
    const scenario = row.scenarios as Record<string, unknown> | null;
    const persona = row.personas as Record<string, unknown> | null;
    const analytics = row.session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
    const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;

    return {
      id: row.id,
      date: row.created_at,
      scenarioName: scenario?.title ?? "Unknown Scenario",
      personaName: persona?.name ?? "Unknown Persona",
      score: analyticsObj?.overall_score ?? 0,
      duration: row.duration_seconds ?? 0,
      callType: scenario?.call_type ?? "discovery",
    };
  });

  const totalPages = Math.ceil((count ?? 0) / limit);
  return NextResponse.json({ sessions, totalPages, page, limit });
}
