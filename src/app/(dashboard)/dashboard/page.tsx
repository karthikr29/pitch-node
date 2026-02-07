"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ArrowRight, Mic, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

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
  },
  {
    type: "demo",
    title: "Product Demo",
    description: "Showcase features and drive value",
  },
  {
    type: "negotiation",
    title: "Negotiation",
    description: "Handle pricing and close terms",
  },
  {
    type: "cold-call",
    title: "Cold Call",
    description: "Break through and book meetings",
  },
  {
    type: "follow-up",
    title: "Follow-Up",
    description: "Re-engage and advance deals",
  },
  {
    type: "closing",
    title: "Closing Call",
    description: "Seal the deal and handle objections",
  },
];

function getScoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-error";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-success/10";
  if (score >= 60) return "bg-warning/10";
  return "bg-error/10";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/* Circular progress ring for percentage stats */
function ScoreRing({
  value,
  size = 56,
  strokeWidth = 4,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="text-primary"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] as const }}
        style={{ strokeDasharray: circumference }}
      />
    </svg>
  );
}

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

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

  const avgScore = stats?.avgScore ?? 0;
  const bestScore = stats?.bestScore ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero: Greeting + CTA Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-secondary/90 to-secondary/70 dark:from-[#1a2435] dark:via-[#1a2435]/90 dark:to-[#1a2435]/70 p-6 sm:p-8">
          {/* Subtle gradient orb */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-accent/5 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-white/50 font-medium">
                {format(new Date(), "EEEE, MMMM d")}
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight mt-1">
                {getGreeting()},{" "}
                <span className="text-primary">{firstName}</span>
              </h2>
              <p className="text-white/60 mt-1.5 text-sm">
                Ready to sharpen your sales skills?
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="sm:w-auto w-full shadow-[0_4px_24px_rgba(236,114,17,0.3)] hover:shadow-[0_4px_32px_rgba(236,114,17,0.45)] transition-shadow"
            >
              <Link href="/dashboard/practice">
                <Mic className="w-4 h-4 mr-2" />
                New Session
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats: Bento-style grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Total Sessions */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Total Sessions
              </p>
              {loading ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <AnimatedCounter
                  value={stats?.totalSessions ?? 0}
                  className="block text-4xl font-bold text-foreground tabular-nums mt-2"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Score — with ring */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Avg Score
              </p>
              {loading ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <div className="flex items-center gap-3 mt-2">
                  <ScoreRing value={avgScore} />
                  <div className="flex items-baseline gap-0.5">
                    <AnimatedCounter
                      value={avgScore}
                      className="text-3xl font-bold text-foreground tabular-nums"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Streak */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Current Streak
              </p>
              {loading ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <div className="flex items-baseline gap-1.5 mt-2">
                  <AnimatedCounter
                    value={stats?.currentStreak ?? 0}
                    className="text-4xl font-bold text-foreground tabular-nums"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Best Score — with ring */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Best Score
              </p>
              {loading ? (
                <Skeleton className="h-10 w-16 mt-2" />
              ) : (
                <div className="flex items-center gap-3 mt-2">
                  <ScoreRing value={bestScore} />
                  <div className="flex items-baseline gap-0.5">
                    <AnimatedCounter
                      value={bestScore}
                      className="text-3xl font-bold text-foreground tabular-nums"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Bottom: Sessions + Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Sessions — 2 columns */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: 0.25,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
          }}
        >
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">
                Recent Sessions
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link href="/dashboard/history">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-7 w-14 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    No sessions yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    Complete your first practice session to see your progress
                    here.
                  </p>
                  <Button size="sm" className="mt-5" asChild>
                    <Link href="/dashboard/practice">
                      <Mic className="w-3.5 h-3.5 mr-1.5" />
                      Start Practicing
                    </Link>
                  </Button>
                </div>
              ) : (
                <motion.div
                  className="space-y-0.5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {recentSessions.map((session) => (
                    <motion.div key={session.id} variants={itemVariants}>
                      <Link
                        href={`/dashboard/history/${session.id}`}
                        className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        {/* Score ring mini */}
                        <ScoreRing
                          value={session.score}
                          size={36}
                          strokeWidth={3}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                            {session.scenarioName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(session.date), "MMM d")}
                            </span>
                            <span className="text-border text-[11px]">
                              ·
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 capitalize h-4"
                            >
                              {(session.callType || "").replace("-", " ")}
                            </Badge>
                          </div>
                        </div>
                        <div
                          className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold tabular-nums ${getScoreColor(session.score)} ${getScoreBg(session.score)}`}
                        >
                          {session.score}%
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Start — 1 column, compact grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: 0.35,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
          }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {quickStartItems.map((item) => (
                  <Link
                    key={item.type}
                    href={`/dashboard/practice?type=${item.type}`}
                    className="group relative rounded-lg border border-border/50 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                  >
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
