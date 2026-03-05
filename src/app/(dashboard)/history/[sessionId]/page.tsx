"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Radio,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

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

type RecordingStatus = "none" | "processing" | "ready" | "failed" | "expired";

interface RecordingDetail {
  status: RecordingStatus;
  url: string | null;
  durationSeconds: number | null;
  expiresAt: string | null;
  error: string | null;
}

interface SessionDetail {
  id: string;
  scenarioName: string;
  personaName: string;
  date: string;
  duration: number;
  callType: string;
  overallScore: number;
  metrics: Metrics;
  transcript: TranscriptMessage[];
  highlights: Highlight[];
  suggestions: string[];
  recording: RecordingDetail;
}

function getLetterGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toRecordingStatus(value: unknown): RecordingStatus {
  if (value === "processing" || value === "ready" || value === "failed" || value === "expired" || value === "none") {
    return value;
  }
  return "none";
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80
      ? "bg-green-500"
      : value >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// Fallback data when API is not available
const fallbackSession: SessionDetail = {
  id: "demo",
  scenarioName: "SaaS Discovery Call",
  personaName: "The Skeptic",
  date: new Date().toISOString(),
  duration: 420,
  callType: "discovery",
  overallScore: 72,
  metrics: {
    activeListening: 78,
    objectionHandling: 65,
    closing: 70,
    rapport: 75,
  },
  transcript: [
    {
      speaker: "user",
      text: "Hi Sarah, thanks for taking the time today. I'd love to learn more about how your team currently manages projects.",
      timestamp: "0:00",
    },
    {
      speaker: "ai",
      text: "Sure, but I should warn you, we've been burned by tools before. What makes yours any different?",
      timestamp: "0:15",
    },
    {
      speaker: "user",
      text: "I completely understand that concern. Before I share what we do, could you tell me about what specifically didn't work with previous tools?",
      timestamp: "0:30",
    },
    {
      speaker: "ai",
      text: "Mostly the onboarding was terrible. Took months and we lost a lot of productivity. And the integrations never really worked well with our existing stack.",
      timestamp: "0:52",
    },
    {
      speaker: "user",
      text: "That's really valuable insight. Integration and quick onboarding are exactly the areas where we've invested the most. Would it be helpful if I walked you through how we handle that?",
      timestamp: "1:12",
    },
  ],
  highlights: [
    {
      type: "good",
      text: "Strong opening - asked about current workflow before pitching",
      timestamp: "0:00",
      suggestion: "Great job leading with curiosity rather than features.",
    },
    {
      type: "good",
      text: "Acknowledged concern before redirecting with a discovery question",
      timestamp: "0:30",
    },
    {
      type: "bad",
      text: "Missed opportunity to quantify the impact of lost productivity",
      timestamp: "0:52",
      suggestion:
        "Try asking 'How much time did your team lose during that transition?' to build urgency.",
    },
    {
      type: "bad",
      text: "Jumped to solution too quickly - could have probed deeper on integration needs",
      timestamp: "1:12",
      suggestion:
        "Ask 'Which specific integrations are most critical for your team?' before presenting capabilities.",
    },
  ],
  suggestions: [
    "Practice asking follow-up questions to quantify pain points before presenting solutions.",
    "Try the SPIN technique: Situation, Problem, Implication, Need-payoff.",
    "When a prospect shares a concern, mirror their language back to build rapport.",
    "Before transitioning to your pitch, summarize what you've heard to confirm understanding.",
  ],
  recording: {
    status: "none",
    url: null,
    durationSeconds: null,
    expiresAt: null,
    error: null,
  },
};

function transformApiData(data: Record<string, unknown>, sessionId: string): SessionDetail {
  const recordingRaw = (data.recording as Record<string, unknown> | null) ?? null;
  const recordingStatus = toRecordingStatus(recordingRaw?.status);

  return {
    id: (data.id as string) || sessionId,
    scenarioName: ((data.scenario as Record<string, unknown>)?.title as string) || "Practice Session",
    personaName: ((data.persona as Record<string, unknown>)?.name as string) || "AI Prospect",
    date: (data.createdAt as string) || (data.startedAt as string) || new Date().toISOString(),
    duration: (data.durationSeconds as number) || 0,
    callType: ((data.scenario as Record<string, unknown>)?.callType as string) || "discovery",
    overallScore: ((data.analytics as Record<string, unknown>)?.overallScore as number) ?? 0,
    metrics: ((data.analytics as Record<string, unknown>)?.metrics as Metrics) || {
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
    highlights: ((data.analytics as Record<string, unknown>)?.highlightMoments as Highlight[]) || [],
    suggestions: ((data.analytics as Record<string, unknown>)?.improvementSuggestions as string[]) || [],
    recording: {
      status: recordingStatus,
      url: (recordingRaw?.url as string) ?? null,
      durationSeconds: (recordingRaw?.durationSeconds as number) ?? null,
      expiresAt: (recordingRaw?.expiresAt as string) ?? null,
      error: (recordingRaw?.error as string) ?? null,
    },
  };
}

export default function SessionReviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [recordingReady, setRecordingReady] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          const transformed = transformApiData(data, sessionId);
          setSession(transformed);
          setAnalysisReady(!!data.analytics);
          setRecordingReady(transformed.recording.status !== "processing");
        } else {
          setSession({ ...fallbackSession, id: sessionId });
          setAnalysisReady(true);
          setRecordingReady(true);
        }
      } catch {
        setSession({ ...fallbackSession, id: sessionId });
        setAnalysisReady(true);
        setRecordingReady(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  // Poll every 3 s until analysis is ready
  const pollAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      const transformed = transformApiData(data, sessionId);
      setSession(transformed);
      if (data.analytics) {
        setAnalysisReady(true);
      }
      setRecordingReady(transformed.recording.status !== "processing");
    } catch {
      // silently ignore poll errors
    }
  }, [sessionId]);

  useEffect(() => {
    if (loading || (analysisReady && recordingReady)) return;
    const timer = setInterval(pollAnalysis, 3000);
    return () => clearInterval(timer);
  }, [analysisReady, recordingReady, loading, pollAnalysis]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 col-span-1" />
          <Skeleton className="h-40 col-span-2" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Session not found.</p>
        <Button className="mt-4" asChild>
          <Link href="/history">Back to History</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/history">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </Link>
      </Button>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {session.scenarioName}
        </h2>
        <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
          <span>{session.personaName}</span>
          <span>-</span>
          <Badge variant="outline" className="capitalize">
            {session.callType.replace("-", " ")}
          </Badge>
        </div>
      </div>

      {/* Score Card */}
      {!analysisReady ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium text-foreground">Analyzing your session...</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI is reviewing your transcript. This usually takes 2–3 minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Overall Score */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
              <div
                className={cn(
                  "text-5xl font-bold",
                  getScoreColor(session.overallScore)
                )}
              >
                {session.overallScore}
              </div>
              <Badge
                className={cn(
                  "mt-2 text-lg px-3 py-1",
                  session.overallScore >= 80
                    ? "bg-green-500/10 text-green-600"
                    : session.overallScore >= 60
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-red-500/10 text-red-600"
                )}
                variant="outline"
              >
                {getLetterGrade(session.overallScore)}
              </Badge>
            </CardContent>
          </Card>

          {/* Metric Bars */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricBar label="Active Listening"   value={session.metrics.activeListening} />
              <MetricBar label="Objection Handling" value={session.metrics.objectionHandling} />
              <MetricBar label="Closing Technique"  value={session.metrics.closing} />
              <MetricBar label="Rapport Building"   value={session.metrics.rapport} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recording */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Call Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.recording.status === "ready" && session.recording.url ? (
            <div className="space-y-3">
              <audio controls preload="metadata" className="w-full" src={session.recording.url}>
                Your browser does not support audio playback.
              </audio>
              {session.recording.durationSeconds !== null && (
                <p className="text-sm text-muted-foreground">
                  Duration: {formatTimestamp(session.recording.durationSeconds * 1000)}
                </p>
              )}
            </div>
          ) : null}

          {session.recording.status === "processing" ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Recording is processing. Playback will appear automatically.
            </div>
          ) : null}

          {session.recording.status === "failed" ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
              {session.recording.error || "Recording could not be prepared for playback."}
            </div>
          ) : null}

          {session.recording.status === "expired" ? (
            <p className="text-sm text-muted-foreground">
              Recording expired
              {session.recording.expiresAt ? ` on ${formatDateTime(session.recording.expiresAt)}.` : "."}
            </p>
          ) : null}

          {session.recording.status === "none" ? (
            <p className="text-sm text-muted-foreground">
              No recording is available for this session.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
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
                      "max-w-[75%] rounded-xl px-4 py-3",
                      msg.speaker === "user"
                        ? "bg-primary/10 text-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {msg.speaker === "user" ? "You" : session.personaName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp}
                      </span>
                    </div>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Key Moments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.highlights.map((highlight, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-4",
                highlight.type === "good"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              )}
            >
              <div className="flex items-start gap-3">
                {highlight.type === "good" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {highlight.text}
                  </p>
                  {highlight.timestamp && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      at {highlight.timestamp}
                    </p>
                  )}
                  {highlight.suggestion && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {highlight.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            AI Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {session.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{suggestion}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-center pb-8">
        <Button asChild>
          <Link href="/practice">Practice Again</Link>
        </Button>
      </div>
    </div>
  );
}
