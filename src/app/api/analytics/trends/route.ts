import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

const DEFAULT_DAYS = 365;
const MAX_DAYS = 365;
const BATCH_SIZE = 500;

function normalizeDays(rawDays: string | null): number {
  const parsedDays = Number.parseInt(rawDays || String(DEFAULT_DAYS), 10);
  if (!Number.isFinite(parsedDays)) return DEFAULT_DAYS;
  return Math.min(Math.max(parsedDays, 1), MAX_DAYS);
}

function getAnalyticsObject(
  analytics: Record<string, unknown> | Record<string, unknown>[] | null
): Record<string, unknown> | null {
  return Array.isArray(analytics) ? analytics[0] ?? null : analytics;
}

function getScenarioObject(
  scenario: Record<string, unknown> | Record<string, unknown>[] | null
): Record<string, unknown> | null {
  return Array.isArray(scenario) ? scenario[0] ?? null : scenario;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const days = normalizeDays(request.nextUrl.searchParams.get("days"));
    const now = new Date();
    const since = new Date(now);
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const trends: { date: string; score: number }[] = [];
    const callTypeMap: Record<string, { totalScore: number; count: number }> = {};
    const metricTotals: Record<string, { total: number; count: number }> = {};
    const activityMap: Record<string, number> = {};
    const recentSessionRows: Record<string, unknown>[] = [];
    const gradeMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    let offset = 0;
    let batchCount = 0;
    let sessionCount = 0;

    while (true) {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, created_at, scenarios(title, call_type), session_analytics(overall_score, scores, letter_grade)")
        .eq("user_id", user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const rows = data || [];
      batchCount += 1;
      sessionCount += rows.length;

      for (const row of rows) {
        const scenario = getScenarioObject(
          row.scenarios as Record<string, unknown> | Record<string, unknown>[] | null
        );
        const analyticsObj = getAnalyticsObject(
          row.session_analytics as Record<string, unknown> | Record<string, unknown>[] | null
        );
        const createdAt = row.created_at as string;
        const date = new Date(createdAt);

        trends.push({
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score: (analyticsObj?.overall_score as number) ?? 0,
        });

        const dateStr = date.toISOString().split("T")[0];
        activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;

        recentSessionRows.push(row as Record<string, unknown>);
        if (recentSessionRows.length > 6) recentSessionRows.shift();

        const letterGrade = analyticsObj?.letter_grade as string | null;
        if (letterGrade) {
          const major = letterGrade.charAt(0).toUpperCase();
          if (major in gradeMap) gradeMap[major]++;
        }

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

        const callType = (scenario?.call_type as string) ?? "unknown";
        const score = (analyticsObj?.overall_score as number) ?? 0;
        if (!callTypeMap[callType]) callTypeMap[callType] = { totalScore: 0, count: 0 };
        callTypeMap[callType].totalScore += score;
        callTypeMap[callType].count += 1;
      }

      if (rows.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    const callTypePerformance = Object.entries(callTypeMap).map(([callType, v]) => ({
      callType: callType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      avgScore: Math.round(v.totalScore / v.count),
      sessions: v.count,
    }));

    // Build skill metrics from scores JSON
    const metrics = Object.entries(metricTotals).map(([metric, v]) => ({
      metric: metric.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: Math.round(v.total / v.count),
    }));

    // Build activity data (sessions per day)
    const activity: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      activity.push({ date: dateStr, count: activityMap[dateStr] || 0 });
    }

    // Build recent sessions (last 6, newest first)
    const recentSessions = [...recentSessionRows]
      .reverse()
      .map((row) => {
        const scenario = getScenarioObject(
          row.scenarios as Record<string, unknown> | Record<string, unknown>[] | null
        );
        const analyticsObj = getAnalyticsObject(
          row.session_analytics as Record<string, unknown> | Record<string, unknown>[] | null
        );
        return {
          id: row.id as string,
          date: new Date(row.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          scenarioName: (scenario?.title as string) || "Practice Session",
          callType: ((scenario?.call_type as string) || "unknown")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          score: (analyticsObj?.overall_score as number) ?? null,
          letterGrade: (analyticsObj?.letter_grade as string) ?? null,
        };
      });

    // Build grade distribution
    const gradeDistribution = ["A", "B", "C", "D", "F"].map((grade) => ({
      grade,
      count: gradeMap[grade],
    }));

    Sentry.logger.debug("analytics/trends: returned", {
      userId: user.id,
      days,
      batchCount,
      sessionCount,
    });
    return NextResponse.json({ trends, callTypePerformance, metrics, activity, recentSessions, gradeDistribution });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "analytics/trends" } });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
