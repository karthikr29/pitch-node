import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = parseInt(request.nextUrl.searchParams.get("days") || "365");
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("sessions")
    .select("id, created_at, scenarios(title, call_type), session_analytics(overall_score, scores, letter_grade)")
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build trends (score over time)
  const trends = (data || []).map((row: Record<string, unknown>) => {
    const analytics = row.session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
    const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;
    const date = new Date(row.created_at as string);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: (analyticsObj?.overall_score as number) ?? 0,
    };
  });

  // Build call type performance
  const callTypeMap: Record<string, { totalScore: number; count: number }> = {};
  for (const row of data || []) {
    const scenario = (row as Record<string, unknown>).scenarios as Record<string, unknown> | null;
    const analytics = (row as Record<string, unknown>).session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
    const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;
    const callType = (scenario?.call_type as string) ?? "unknown";
    const score = (analyticsObj?.overall_score as number) ?? 0;

    if (!callTypeMap[callType]) callTypeMap[callType] = { totalScore: 0, count: 0 };
    callTypeMap[callType].totalScore += score;
    callTypeMap[callType].count += 1;
  }
  const callTypePerformance = Object.entries(callTypeMap).map(([callType, v]) => ({
    callType: callType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    avgScore: Math.round(v.totalScore / v.count),
    sessions: v.count,
  }));

  // Build skill metrics from scores JSON
  const metricTotals: Record<string, { total: number; count: number }> = {};
  for (const row of data || []) {
    const analytics = (row as Record<string, unknown>).session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
    const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;
    const scores = analyticsObj?.scores as Record<string, number> | null;
    if (scores && typeof scores === "object") {
      for (const [metric, value] of Object.entries(scores)) {
        if (typeof value === "number") {
          if (!metricTotals[metric]) metricTotals[metric] = { total: 0, count: 0 };
          metricTotals[metric].total += value;
          metricTotals[metric].count += 1;
        }
      }
    }
  }
  const metrics = Object.entries(metricTotals).map(([metric, v]) => ({
    metric: metric.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value: Math.round(v.total / v.count),
  }));

  // Build activity data (sessions per day)
  const activityMap: Record<string, number> = {};
  for (const row of data || []) {
    const dateStr = new Date((row as Record<string, unknown>).created_at as string).toISOString().split("T")[0];
    activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
  }
  const now = new Date();
  const activity = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    activity.push({ date: dateStr, count: activityMap[dateStr] || 0 });
  }

  // Build recent sessions (last 6, newest first)
  const recentSessions = [...(data || [])]
    .sort((a, b) =>
      new Date((b as Record<string, unknown>).created_at as string).getTime() -
      new Date((a as Record<string, unknown>).created_at as string).getTime()
    )
    .slice(0, 6)
    .map((row) => {
      const r = row as Record<string, unknown>;
      const scenario = r.scenarios as Record<string, unknown> | null;
      const analytics = r.session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
      const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;
      return {
        id: r.id as string,
        date: new Date(r.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        scenarioName: (scenario?.title as string) || "Practice Session",
        callType: ((scenario?.call_type as string) || "unknown")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase()),
        score: (analyticsObj?.overall_score as number) ?? null,
        letterGrade: (analyticsObj?.letter_grade as string) ?? null,
      };
    });

  // Build grade distribution
  const gradeMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const row of data || []) {
    const analytics = (row as Record<string, unknown>).session_analytics as Record<string, unknown> | Record<string, unknown>[] | null;
    const analyticsObj = Array.isArray(analytics) ? analytics[0] : analytics;
    const letterGrade = analyticsObj?.letter_grade as string | null;
    if (letterGrade) {
      const major = letterGrade.charAt(0).toUpperCase();
      if (major in gradeMap) gradeMap[major]++;
    }
  }
  const gradeDistribution = ["A", "B", "C", "D", "F"].map((grade) => ({
    grade,
    count: gradeMap[grade],
  }));

  return NextResponse.json({ trends, callTypePerformance, metrics, activity, recentSessions, gradeDistribution });
}
