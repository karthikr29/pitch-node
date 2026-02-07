"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function ActivityCalendar({ data }: { data: ActivityDay[] }) {
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  function getColor(count: number) {
    if (count === 0) return "bg-muted";
    if (count === 1) return "bg-primary/30";
    if (count === 2) return "bg-primary/60";
    return "bg-primary";
  }

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div
              key={di}
              className={cn(
                "w-3 h-3 rounded-sm",
                getColor(day.count)
              )}
              title={`${day.date}: ${day.count} sessions`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

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
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Analytics
        </h2>
        <p className="text-muted-foreground mt-1">
          Track your progress and identify areas for improvement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ fill: "var(--primary)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Call Type Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance by Call Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callTypeData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="callType"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="avgScore"
                    name="Avg Score"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Metric Breakdown Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Skill Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis
                    dataKey="metric"
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <ActivityCalendar data={activityData} />
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm bg-primary/30" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span>More</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
