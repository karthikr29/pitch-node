import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("*, scenarios(title, call_type), personas(name, emoji), session_analytics(overall_score)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("*, achievements(*)")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false })
    .limit(5);

  const overview = {
    totalSessions: progress?.total_sessions ?? 0,
    avgScore: progress?.average_score ?? 0,
    currentStreak: progress?.current_streak ?? 0,
    bestScore: progress?.best_score ?? 0,
  };

  const sessions = (recentSessions || []).map((row: Record<string, unknown>) => {
    const scenario = row.scenarios as Record<string, unknown> | null;
    const persona = row.personas as Record<string, unknown> | null;
    const analytics = row.session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
    const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;

    return {
      id: row.id,
      date: row.created_at,
      scenarioName: scenario?.title ?? "Unknown Scenario",
      callType: scenario?.call_type ?? "discovery",
      score: analyticsObj?.overall_score ?? 0,
    };
  });

  return NextResponse.json({ ...overview, recentSessions: sessions, achievements });
}
