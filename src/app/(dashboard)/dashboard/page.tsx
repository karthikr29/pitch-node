"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Target,
  Flame,
  Trophy,
  Search,
  Presentation,
  Handshake,
  Phone,
  MailCheck,
  BadgeCheck,
  ArrowRight,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface OverviewStats {
  totalSessions: number;
  avgScore: number;
  currentStreak: number;
  bestScore: number;
}

interface RecentSession {
  id: string;
  scenarioName: string;
  score: number;
  date: string;
  callType: string;
}

const quickStartItems = [
  {
    type: "discovery",
    title: "Discovery Call",
    description: "Uncover needs and qualify prospects",
    icon: Search,
    color: "text-blue-500",
  },
  {
    type: "demo",
    title: "Product Demo",
    description: "Showcase features and drive value",
    icon: Presentation,
    color: "text-purple-500",
  },
  {
    type: "negotiation",
    title: "Negotiation",
    description: "Handle pricing and close terms",
    icon: Handshake,
    color: "text-green-500",
  },
  {
    type: "cold-call",
    title: "Cold Call",
    description: "Break through and book meetings",
    icon: Phone,
    color: "text-orange-500",
  },
  {
    type: "follow-up",
    title: "Follow-Up",
    description: "Re-engage and advance deals",
    icon: MailCheck,
    color: "text-teal-500",
  },
  {
    type: "closing",
    title: "Closing Call",
    description: "Seal the deal and handle objections",
    icon: BadgeCheck,
    color: "text-red-500",
  },
];

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  suffix,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  loading: boolean;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1">
                {value}
                {suffix}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, sessionsRes] = await Promise.all([
          fetch("/api/analytics/overview"),
          fetch("/api/sessions?limit=5"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setRecentSessions(data.sessions || []);
        }
      } catch {
        // API not available yet, use empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Welcome back, {firstName}
        </h2>
        <p className="text-muted-foreground mt-1">
          Ready to sharpen your sales skills today?
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={stats?.totalSessions ?? 0}
          icon={Activity}
          loading={loading}
        />
        <StatCard
          title="Avg Score"
          value={stats?.avgScore ?? 0}
          icon={Target}
          loading={loading}
          suffix="%"
        />
        <StatCard
          title="Current Streak"
          value={stats?.currentStreak ?? 0}
          icon={Flame}
          loading={loading}
          suffix=" days"
        />
        <StatCard
          title="Best Score"
          value={stats?.bestScore ?? 0}
          icon={Trophy}
          loading={loading}
          suffix="%"
        />
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Sessions</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/history">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No sessions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start a practice session to see your progress here.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/dashboard/practice">Start Practicing</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/history/${session.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {session.scenarioName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(session.date), "MMM d, yyyy")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {session.callType}
                      </Badge>
                    </div>
                  </div>
                  <span
                    className={`text-lg font-bold ${getScoreColor(session.score)}`}
                  >
                    {session.score}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Start */}
      <div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-4">
          Quick Start
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickStartItems.map((item) => (
            <Link
              key={item.type}
              href={`/dashboard/practice?type=${item.type}`}
            >
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
