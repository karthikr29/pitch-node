"use client";

import { useEffect, useState } from "react";
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
  MessageSquare,
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
  discovery: number;
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
  overallScore: number;
  metrics: Metrics;
  transcript: TranscriptMessage[];
  highlights: Highlight[];
  suggestions: string[];
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
    discovery: 78,
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
};

export default function SessionReviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        } else {
          setSession({ ...fallbackSession, id: sessionId });
        }
      } catch {
        setSession({ ...fallbackSession, id: sessionId });
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

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
          <Link href="/dashboard/history">Back to History</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/history">
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
            <MetricBar label="Discovery & Questioning" value={session.metrics.discovery} />
            <MetricBar label="Objection Handling" value={session.metrics.objectionHandling} />
            <MetricBar label="Closing Technique" value={session.metrics.closing} />
            <MetricBar label="Rapport Building" value={session.metrics.rapport} />
          </CardContent>
        </Card>
      </div>

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
          <Link href="/dashboard/practice">Practice Again</Link>
        </Button>
      </div>
    </div>
  );
}
