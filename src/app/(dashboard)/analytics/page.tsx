"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Calendar, Award, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrendPoint {
  date: string;
  score: number;
}

interface MetricBreakdown {
  metric: string;
  value: number;
}

interface GradeDistribution {
  grade: string;
  count: number;
}

interface ActivityDay {
  date: string;
  count: number;
}


const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const GRADE_COLORS: Record<string, string> = {
  A: "#34d399",
  B: "#60a5fa",
  C: "#fbbf24",
  D: "#f97316",
  F: "#f87171",
};

function getActivityColor(count: number) {
  if (count === 0) return "bg-muted/60";
  if (count === 1) return "bg-primary/20";
  if (count <= 3) return "bg-primary/40";
  if (count <= 5) return "bg-primary/65";
  return "bg-primary/90";
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function skillBarBg(value: number): string {
  if (value >= 70) return "bg-primary";
  if (value >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function ActivityCalendar({ data }: { data: ActivityDay[] }) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  if (data.length === 0) {
    return <div className="text-xs text-muted-foreground">No activity data available.</div>;
  }

  const firstDow = new Date(data[0].date).getDay();
  const padded: (ActivityDay | null)[] = [...Array(firstDow).fill(null), ...data];
  const weeks: (ActivityDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const monthLabels: string[] = weeks.map((week, wi) => {
    const firstReal = week.find((d) => d !== null) as ActivityDay | undefined;
    if (!firstReal) return "";
    const curMonth = new Date(firstReal.date).getMonth();
    if (wi === 0) return MONTH_ABBR[curMonth];
    const prevWeek = weeks[wi - 1];
    const prevReal = prevWeek?.find((d) => d !== null) as ActivityDay | undefined;
    if (!prevReal) return "";
    const prevMonth = new Date(prevReal.date).getMonth();
    return curMonth !== prevMonth ? MONTH_ABBR[curMonth] : "";
  });

  const totalSessions = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="relative w-fit mx-auto">
      <p className="text-xs text-muted-foreground mb-2">
        {totalSessions} session{totalSessions !== 1 ? "s" : ""} in the last year
      </p>
      <div className="flex gap-[3px]">
        <div className="flex flex-col gap-[3px] pt-[17px] mr-1">
          {DOW_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-3 flex items-center text-[9px] text-muted-foreground leading-none"
              style={{ width: 22 }}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="flex flex-col">
          <div className="flex gap-[3px] mb-[3px] h-[14px]">
            {weeks.map((_, wi) => (
              <div
                key={wi}
                className="text-[9px] text-muted-foreground leading-none"
                style={{ width: 12, minWidth: 12 }}
              >
                {monthLabels[wi]}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = week[di] ?? null;
                  return (
                    <div
                      key={di}
                      className={cn(
                        "w-3 h-3 rounded-[2px] transition-colors",
                        day ? getActivityColor(day.count) : "bg-transparent",
                        day ? "hover:ring-1 hover:ring-primary/40 cursor-default" : ""
                      )}
                      onMouseEnter={
                        day
                          ? (e) => {
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setTooltip({ date: day.date, count: day.count, x: rect.left + rect.width / 2, y: rect.top });
                            }
                          : undefined
                      }
                      onMouseLeave={day ? () => setTooltip(null) : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 rounded bg-popover border border-border text-[11px] text-popover-foreground shadow-md -translate-x-1/2 -translate-y-full -mt-1"
          style={{ top: tooltip.y - 6, left: tooltip.x }}
        >
          {tooltip.date} · {tooltip.count} session{tooltip.count !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function GradeDonutChart({ data }: { data: GradeDistribution[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Award className="w-9 h-9 text-muted-foreground/25 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No grade data yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Complete sessions to see your grade breakdown</p>
      </div>
    );
  }

  const pieData = data.filter((d) => d.count > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Donut + center label */}
      <div className="relative h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="count"
              nameKey="grade"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              strokeWidth={3}
              stroke="var(--card)"
              paddingAngle={pieData.length > 1 ? 3 : 0}
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((entry) => (
                <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--popover-foreground)",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
              itemStyle={{ color: "var(--popover-foreground)" }}
              formatter={(value, name) => [
                `${value} session${Number(value) !== 1 ? "s" : ""}`,
                `Grade ${name}`,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-foreground leading-none tabular-nums">{total}</span>
          <span className="text-[11px] text-muted-foreground mt-1 leading-none">
            {total === 1 ? "session" : "sessions"}
          </span>
        </div>
      </div>

      {/* Legend: 5 grade tiles */}
      <div className="grid grid-cols-5 gap-2">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const isActive = item.count > 0;
          return (
            <div
              key={item.grade}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg py-2.5 transition-opacity",
                isActive ? "bg-muted/20" : "opacity-25"
              )}
            >
              <span
                className="text-base font-bold leading-none"
                style={{ color: GRADE_COLORS[item.grade] }}
              >
                {item.grade}
              </span>
              <span className="text-sm font-semibold text-foreground leading-none tabular-nums">
                {item.count}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none tabular-nums">
                {isActive ? `${pct}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillBars({ metrics }: { metrics: MetricBreakdown[] }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 150);
    return () => clearTimeout(t);
  }, [metrics]);

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Target className="w-9 h-9 text-muted-foreground/25 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No skill data yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Complete sessions to see your skill breakdown</p>
      </div>
    );
  }

  const sorted = [...metrics].sort((a, b) => b.value - a.value);
  const weakest = sorted[sorted.length - 1];

  return (
    <div>
      {/* Skill bars */}
      <div className="space-y-[18px]">
        {sorted.map((m, i) => (
          <div key={m.metric}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground truncate max-w-[160px] leading-none">
                {m.metric}
              </span>
              <span className={cn("text-sm font-bold tabular-nums leading-none", scoreColor(m.value))}>
                {(m.value / 10).toFixed(1)}
                <span className="text-[10px] font-normal text-muted-foreground/50">/10</span>
              </span>
            </div>
            <div className="h-[5px] bg-muted/40 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", skillBarBg(m.value))}
                style={{
                  width: animate ? `${m.value}%` : "0%",
                  transition: `width 600ms cubic-bezier(0.4, 0, 0.2, 1) ${i * 90}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Focus Area callout */}
      <div className="mt-6 pt-4 border-t border-border/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">
          Focus Area
        </p>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          <span className="text-xs font-medium text-foreground">{weakest.metric}</span>
          <span className={cn("text-xs font-bold tabular-nums ml-auto", scoreColor(weakest.value))}>
            {(weakest.value / 10).toFixed(1)}/10
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/55 mt-1.5 ml-3.5">
          Prioritize this in your next session
        </p>
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--foreground)",
  fontSize: "12px",
  padding: "8px 12px",
};

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [metrics, setMetrics] = useState<MetricBreakdown[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [activityData, setActivityData] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/analytics/trends");
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends || []);
        setMetrics(data.metrics || []);
        setGradeDistribution(data.gradeDistribution || []);
        setActivityData(data.activity || []);
      } else {
        setError(true);
        setTrends([]);
        setMetrics([]);
        setGradeDistribution([]);
        setActivityData([]);
      }
    } catch {
      setError(true);
      setTrends([]);
      setMetrics([]);
      setGradeDistribution([]);
      setActivityData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-48 lg:col-span-2 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
          Analytics
        </h2>
        <p className="text-muted-foreground mt-1">
          Track your progress and identify areas for improvement
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-foreground flex-1">Couldn&apos;t load analytics data</p>
          <Button size="sm" variant="outline" onClick={fetchAnalytics}>Try Again</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Score Trend</CardTitle>
                <CardDescription className="text-xs">
                  Your performance trajectory over time
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center h-72">
                <TrendingUp className="w-9 h-9 text-muted-foreground/25 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No trend data yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Complete sessions to see your score over time</p>
              </div>
            ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    tickFormatter={(v) => `${Number(v) / 10}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`${(Number(v ?? 0) / 10).toFixed(1)}/10`, "Score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={{ fill: "var(--primary)", r: 3, strokeWidth: 2, stroke: "var(--card)" }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Grade Distribution</CardTitle>
                <CardDescription className="text-xs">
                  How your sessions are graded
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <GradeDonutChart data={gradeDistribution} />
          </CardContent>
        </Card>

        {/* Skill Scores */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Skill Scores</CardTitle>
                <CardDescription className="text-xs">
                  Average across all sessions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SkillBars metrics={metrics} />
          </CardContent>
        </Card>

        {/* Activity Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Activity</CardTitle>
                  <CardDescription className="text-xs">
                    Practice frequency over the last year
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Less</span>
                <div className="w-3 h-3 rounded-[2px] bg-muted/60" />
                <div className="w-3 h-3 rounded-[2px] bg-primary/20" />
                <div className="w-3 h-3 rounded-[2px] bg-primary/40" />
                <div className="w-3 h-3 rounded-[2px] bg-primary/65" />
                <div className="w-3 h-3 rounded-[2px] bg-primary/90" />
                <span>More</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-1">
              <ActivityCalendar data={activityData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
