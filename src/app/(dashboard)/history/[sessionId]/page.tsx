"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MessageSquare,
  Copy,
  Check,
  ArrowRight,
  Clock,
  CalendarDays,
  User2,
  Sparkles,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface TranscriptMessage {
  speaker: "user" | "ai";
  text: string;
  timestamp: string;
}

interface Highlight {
  type: "good" | "bad";
  text: string;
  suggestion?: string;
  timestamp?: string;
}

interface Metrics {
  activeListening: number;
  objectionHandling: number;
  closing: number;
  rapport: number;
}

interface SessionDetail {
  id: string;
  scenarioName: string;
  personaName: string;
  date: string;
  duration: number;
  callType: string;
  difficulty: string;
  overallScore: number;
  metrics: Metrics;
  transcript: TranscriptMessage[];
  highlights: Highlight[];
  suggestions: string[];
  aiSummary: string | null;
  // For Practice Again prefill
  scenarioId: string;
  personaId: string;
  pitchBriefing: Record<string, string> | null;
  inferredRole: string | null;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getLetterGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function getGradeBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-400";
  const textColor =
    value >= 80 ? "text-emerald-400" : value >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono font-semibold tabular-nums", textColor)}>
          {(value / 10).toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </p>
  );
}

function AnalysisSkeleton({ rows = 3, rowHeight = "h-14" }: { rows?: number; rowHeight?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-lg", rowHeight)} />
      ))}
    </div>
  );
}

function AnalysisLoading({ label = "AI is analyzing your call…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/60">This usually takes 2–3 minutes</p>
    </div>
  );
}

function transformApiData(data: Record<string, unknown>, sessionId: string): SessionDetail {
  const scenario = data.scenario as Record<string, unknown> | null;
  const persona = data.persona as Record<string, unknown> | null;
  const analytics = data.analytics as Record<string, unknown> | null;
  return {
    id: (data.id as string) || sessionId,
    scenarioName: (scenario?.title as string) || "Practice Session",
    personaName: (persona?.name as string) || "AI Prospect",
    date: (data.createdAt as string) || (data.startedAt as string) || new Date().toISOString(),
    duration: (data.durationSeconds as number) || 0,
    callType: (scenario?.callType as string) || "discovery",
    difficulty: (scenario?.difficulty as string) || "",
    overallScore: (analytics?.overallScore as number) ?? 0,
    metrics: (analytics?.metrics as Metrics) || {
      activeListening: 0,
      objectionHandling: 0,
      closing: 0,
      rapport: 0,
    },
    transcript: ((data.transcripts as Record<string, unknown>[]) || []).map((t) => ({
      speaker: t.speaker as "user" | "ai",
      text: (t.content as string) || "",
      timestamp: formatTimestamp((t.timestampMs as number) || 0),
    })),
    highlights: (analytics?.highlightMoments as Highlight[]) || [],
    suggestions: (analytics?.improvementSuggestions as string[]) || [],
    aiSummary: (analytics?.aiSummary as string | null) ?? null,
    scenarioId: (scenario?.id as string) || "",
    personaId: (persona?.id as string) || "",
    pitchBriefing: (data.pitchBriefing as Record<string, string> | null) ?? null,
    inferredRole: (data.inferredRole as string | null) ?? null,
  };
}

function cleanAiText(raw: string): string {
  return raw
    .replace(/ — /g, ", ")
    .replace(/—/g, " - ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function SessionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyTranscript = useCallback(async () => {
    if (!session) return;
    const text = session.transcript
      .map((msg) => {
        const speaker = msg.speaker === "user" ? "You" : `${session.personaName} (Persona)`;
        return `[${msg.timestamp}] ${speaker}: ${msg.text}`;
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Transcript copied!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy transcript");
    }
  }, [session]);

  useEffect(() => {
    setLoading(true);
    setSession(null);
    setError(false);
    setAnalysisReady(false);

    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(transformApiData(data, sessionId));
          setAnalysisReady(!!data.analytics);
          Sentry.logger.info("history/detail: session loaded", {
            sessionId,
            hasAnalytics: !!data.analytics,
            transcriptCount: (data.transcripts as unknown[] ?? []).length,
          });
        } else {
          Sentry.logger.warn("history/detail: session fetch failed", { sessionId });
          setError(true);
        }
      } catch {
        Sentry.logger.warn("history/detail: session fetch failed", { sessionId });
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  const pollAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.analytics) {
        setSession(transformApiData(data, sessionId));
        setAnalysisReady(true);
        Sentry.logger.info("history/detail: analysis became ready via poll", { sessionId });
      }
    } catch {
      // silently ignore poll errors
    }
  }, [sessionId]);

  useEffect(() => {
    if (analysisReady || loading) return;
    const timer = setInterval(pollAnalysis, 3000);
    return () => clearInterval(timer);
  }, [analysisReady, loading, pollAnalysis]);

  function handlePracticeAgain() {
    if (!session) return;
    sessionStorage.setItem(
      "practice-prefill",
      JSON.stringify({
        callType: session.callType,
        difficulty: session.difficulty,
        scenarioId: session.scenarioId,
        personaId: session.personaId,
        pitchBriefing: session.pitchBriefing ?? null,
        inferredRole: session.inferredRole ?? null,
      })
    );
    router.push("/practice");
  }

  // ── Full page skeleton while loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 px-1">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 md:col-span-2" />
        </div>
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[440px]" />
          <Skeleton className="h-[440px]" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/40 mb-4">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Session not found</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          This session may have been deleted or is no longer accessible.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/history">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to History
          </Link>
        </Button>
      </div>
    );
  }

  const difficultyColors: Record<string, string> = {
    easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    hard: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    expert: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 px-1">

      {/* ── Back ────────────────────────────────────────────────────────────── */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/history">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to History
        </Link>
      </Button>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Session Review
        </p>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight leading-tight">
          {session.scenarioName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User2 className="w-3.5 h-3.5" />
            {session.personaName}
          </span>
          <span className="text-border">·</span>
          <Badge variant="outline" className="capitalize text-xs font-normal">
            {session.callType.replace(/-|_/g, " ")}
          </Badge>
          {session.difficulty && (
            <Badge
              variant="outline"
              className={cn(
                "capitalize text-xs font-normal",
                difficultyColors[session.difficulty] ?? ""
              )}
            >
              {session.difficulty}
            </Badge>
          )}
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(session.duration)}
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatDate(session.date)}
          </span>
        </div>
      </div>

      {/* ── Score + AI Summary ───────────────────────────────────────────────── */}
      {!analysisReady ? (
        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <AnalysisLoading />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Overall Score */}
          <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Overall Score
            </p>
            <div className={cn("text-5xl font-bold tabular-nums", getScoreColor(session.overallScore))}>
              {(session.overallScore / 10).toFixed(1)}
              <span className="text-2xl text-muted-foreground font-normal">/10</span>
            </div>
            <Badge variant="outline" className={cn("text-base px-3 py-0.5", getGradeBg(session.overallScore))}>
              {getLetterGrade(session.overallScore)}
            </Badge>
          </div>

          {/* AI Assessment Summary */}
          <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                AI Assessment
              </p>
            </div>
            {session.aiSummary ? (
              <p className="text-sm text-foreground leading-relaxed">
                {cleanAiText(session.aiSummary)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No assessment available for this session.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Performance Breakdown ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-muted/20 p-6">
        {!analysisReady ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Performance Breakdown
              </p>
            </div>
            <AnalysisLoading label="Calculating performance scores…" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Performance Breakdown
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <MetricBar label="Active Listening"   value={session.metrics.activeListening} />
              <MetricBar label="Objection Handling" value={session.metrics.objectionHandling} />
              <MetricBar label="Closing Technique"  value={session.metrics.closing} />
              <MetricBar label="Rapport Building"   value={session.metrics.rapport} />
            </div>
          </>
        )}
      </div>

      {/* ── Call Timeline + Transcript ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Call Timeline */}
        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <SectionLabel>Call Timeline</SectionLabel>
          {!analysisReady ? (
            <AnalysisLoading label="Identifying key moments…" />
          ) : session.highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No key moments identified.</p>
          ) : (
            <ScrollArea className="h-[440px] pr-2">
              <div className="relative pl-6">
                {/* Vertical rule */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                {session.highlights.map((h, i) => (
                  <div key={i} className="relative mb-8 last:mb-0">
                    {/* Dot */}
                    <div
                      className={cn(
                        "absolute -left-[17px] top-[5px] h-3 w-3 rounded-full ring-2 ring-background",
                        h.type === "good" ? "bg-emerald-500" : "bg-red-400"
                      )}
                    />
                    {h.timestamp && (
                      <span className="font-mono text-xs text-muted-foreground block mb-1.5">
                        {h.timestamp}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs mb-2",
                        h.type === "good"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-400/10 text-red-400 border-red-400/20"
                      )}
                    >
                      {h.type === "good" ? "WIN" : "IMPROVE"}
                    </Badge>
                    <p className="text-sm text-foreground leading-snug">{h.text}</p>
                    {h.suggestion && (
                      <div className="mt-2 pl-3 border-l-2 border-primary/40">
                        <p className="text-xs text-muted-foreground italic leading-relaxed">{h.suggestion}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Transcript */}
        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>
              <span className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Transcript
              </span>
            </SectionLabel>
            <button
              onClick={handleCopyTranscript}
              title="Copy transcript"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors -mt-4"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <ScrollArea className="h-[440px] pr-3">
            {session.transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transcript available.</p>
            ) : (
              <div className="space-y-4">
                {session.transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3",
                      msg.speaker === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-3",
                        msg.speaker === "user"
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {msg.speaker === "user" ? "You" : session.personaName}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* ── AI Coaching Notes ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-muted/20 p-6">
        <SectionLabel>AI Coaching Notes</SectionLabel>
        {!analysisReady ? (
          <AnalysisLoading label="Generating coaching notes…" />
        ) : session.suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suggestions available.</p>
        ) : (
          <ol className="space-y-3">
            {session.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10 items-start"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── Practice Again ──────────────────────────────────────────────────── */}
      <div className="flex justify-center pt-2">
        <Button size="lg" onClick={handlePracticeAgain} className="group px-8">
          Practice Again
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

    </div>
  );
}
