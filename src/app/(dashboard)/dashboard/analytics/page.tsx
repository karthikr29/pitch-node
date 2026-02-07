"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, BarChart3, Activity, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendPoint {
  date: string;
  score: number;
}

interface CallTypePerformance {
  callType: string;
  avgScore: number;
  sessions: number;
}

interface MetricBreakdown {
  metric: string;
  value: number;
}

interface ActivityDay {
  date: string;
  count: number;
}

// Fallback data
const fallbackTrends: TrendPoint[] = [
  { date: "Jan", score: 55 },
  { date: "Feb", score: 60 },
  { date: "Mar", score: 58 },
  { date: "Apr", score: 67 },
  { date: "May", score: 72 },
  { date: "Jun", score: 70 },
  { date: "Jul", score: 78 },
  { date: "Aug", score: 82 },
];

const fallbackCallTypeData: CallTypePerformance[] = [
  { callType: "Discovery", avgScore: 78, sessions: 12 },
  { callType: "Demo", avgScore: 72, sessions: 8 },
  { callType: "Negotiation", avgScore: 65, sessions: 5 },
  { callType: "Cold Call", avgScore: 60, sessions: 10 },
  { callType: "Follow-Up", avgScore: 74, sessions: 6 },
  { callType: "Closing", avgScore: 68, sessions: 4 },
];

const fallbackMetrics: MetricBreakdown[] = [
  { metric: "Discovery", value: 78 },
  { metric: "Objection Handling", value: 65 },
  { metric: "Closing", value: 70 },
  { metric: "Rapport", value: 75 },
  { metric: "Active Listening", value: 80 },
  { metric: "Value Prop", value: 72 },
];

function generateActivityData(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const now = new Date();
  for (let i = 0; i < 84; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (83 - i));
    days.push({
      date: date.toISOString().split("T")[0],
      count: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0,
    });
  }
  return days;
}

const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

function ActivityCalendar({ data }: { data: ActivityDay[] }) {
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  function getColor(count: number) {
    if (count === 0) return "bg-muted/60";
    if (count === 1) return "bg-primary/25";
    if (count === 2) return "bg-primary/50";
    return "bg-primary/80";
  }

  return (
    <div className="flex gap-[3px]">
      {/* Day labels */}
      <div className="flex flex-col gap-[3px] mr-1">
        {dayLabels.map((label, i) => (
          <div
            key={i}
            className="w-6 h-3.5 flex items-center text-[10px] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => (
            <div
              key={di}
              className={cn(
                "w-3.5 h-3.5 rounded-[3px] transition-colors hover:ring-1 hover:ring-primary/30",
                getColor(day.count)
              )}
              title={`${day.date}: ${day.count} session${day.count !== 1 ? "s" : ""}`}
            />
          ))}
        </div>
      ))}
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
  const [callTypeData, setCallTypeData] = useState<CallTypePerformance[]>([]);
  const [metrics, setMetrics] = useState<MetricBreakdown[]>([]);
  const [activityData, setActivityData] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [trendsRes, overviewRes] = await Promise.all([
          fetch("/api/analytics/trends"),
          fetch("/api/analytics/overview"),
        ]);

        if (trendsRes.ok) {
          const data = await trendsRes.json();
          setTrends(data.trends || fallbackTrends);
          setCallTypeData(data.callTypePerformance || fallbackCallTypeData);
          setMetrics(data.metrics || fallbackMetrics);
          setActivityData(data.activity || generateActivityData());
        } else {
          setTrends(fallbackTrends);
          setCallTypeData(fallbackCallTypeData);
          setMetrics(fallbackMetrics);
          setActivityData(generateActivityData());
        }
      } catch {
        setTrends(fallbackTrends);
        setCallTypeData(fallbackCallTypeData);
        setMetrics(fallbackMetrics);
        setActivityData(generateActivityData());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Trend — Area Chart with gradient fill */}
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
                  />
                  <Tooltip contentStyle={tooltipStyle} />
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
          </CardContent>
        </Card>

        {/* Call Type Performance */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">By Call Type</CardTitle>
                <CardDescription className="text-xs">
                  Average score per scenario category
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callTypeData} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="callType"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={55}
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
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="avgScore"
                    name="Avg Score"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Skill Breakdown Radar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Skill Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Strengths and areas for growth
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={metrics}>
                  <PolarGrid className="stroke-border/40" />
                  <PolarAngleAxis
                    dataKey="metric"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 9 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
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
                    Practice frequency over the last 12 weeks
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Less</span>
                <div className="w-3 h-3 rounded-[3px] bg-muted/60" />
                <div className="w-3 h-3 rounded-[3px] bg-primary/25" />
                <div className="w-3 h-3 rounded-[3px] bg-primary/50" />
                <div className="w-3 h-3 rounded-[3px] bg-primary/80" />
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
