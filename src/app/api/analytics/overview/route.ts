import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: sessionData } = await supabase
      .from("sessions")
      .select("id, created_at, session_analytics(overall_score)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const scores: number[] = [];
    for (const s of sessionData ?? []) {
      const arr = Array.isArray(s.session_analytics) ? s.session_analytics : [s.session_analytics];
      const score = (arr[0] as { overall_score?: number } | null)?.overall_score;
      if (typeof score === "number" && score > 0) scores.push(score);
    }

    const totalSessions = (sessionData ?? []).length;
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length ? Math.max(...scores) : 0;

    const uniqueDates = [...new Set(
      (sessionData ?? []).map(s => s.created_at.slice(0, 10))
    )];
    const currentStreak = computeStreak(uniqueDates);

    const overview = { totalSessions, avgScore, currentStreak, bestScore };

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

    const sessions = (recentSessions || []).map((row: Record<string, unknown>) => {
      const scenario = row.scenarios as Record<string, unknown> | null;
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

    Sentry.logger.debug("analytics/overview: returned", {
      userId: user.id,
      totalSessions,
      avgScore,
      currentStreak,
    });
    return NextResponse.json({ ...overview, recentSessions: sessions, achievements });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "analytics/overview" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
