"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type LucideIcon,
  Search,
  Presentation,
  Handshake,
  Phone,
  MailCheck,
  BadgeCheck,
  Megaphone,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  description: string;
  callType: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
}

const callTypeIcons: Record<string, LucideIcon> = {
  discovery: Search,
  demo: Presentation,
  negotiation: Handshake,
  "cold-call": Phone,
  "cold_call": Phone,
  "follow-up": MailCheck,
  "follow_up": MailCheck,
  closing: BadgeCheck,
  objection: ShieldAlert,
  pitch: Megaphone,
};

const callTypeColors: Record<string, string> = {
  discovery: "text-blue-500",
  demo: "text-purple-500",
  negotiation: "text-green-500",
  "cold-call": "text-orange-500",
  "cold_call": "text-orange-500",
  "follow-up": "text-teal-500",
  "follow_up": "text-teal-500",
  closing: "text-red-500",
  objection: "text-amber-500",
  pitch: "text-cyan-500",
};

const callTypeBgColors: Record<string, string> = {
  discovery: "bg-blue-500/8 dark:bg-blue-500/15",
  demo: "bg-purple-500/8 dark:bg-purple-500/15",
  negotiation: "bg-green-500/8 dark:bg-green-500/15",
  "cold-call": "bg-orange-500/8 dark:bg-orange-500/15",
  "cold_call": "bg-orange-500/8 dark:bg-orange-500/15",
  "follow-up": "bg-teal-500/8 dark:bg-teal-500/15",
  "follow_up": "bg-teal-500/8 dark:bg-teal-500/15",
  closing: "bg-red-500/8 dark:bg-red-500/15",
  objection: "bg-amber-500/8 dark:bg-amber-500/15",
  pitch: "bg-cyan-500/8 dark:bg-cyan-500/15",
};

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/10 text-green-600 border-green-500/20",
  easy: "bg-green-500/10 text-green-600 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Hard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  hard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Expert: "bg-red-500/10 text-red-600 border-red-500/20",
  expert: "bg-red-500/10 text-red-600 border-red-500/20",
};

const difficultyDisplayNames: Record<string, string> = {
  Easy: "Warm-Up",
  easy: "Warm-Up",
  Medium: "Game On",
  medium: "Game On",
  Hard: "Pressure Test",
  hard: "Pressure Test",
  Expert: "Boss Fight",
  expert: "Boss Fight",
};

function getDifficultyDisplayName(difficulty: string): string {
  return difficultyDisplayNames[difficulty] ?? difficulty;
}

const filterOptions = [
  { value: "pitch", label: "Pitch", enabled: true },
  { value: "cold-call", label: "Cold Call", enabled: false },
  { value: "discovery", label: "Discovery", enabled: false },
  { value: "demo", label: "Demo", enabled: false },
  { value: "negotiation", label: "Negotiation", enabled: false },
  { value: "follow-up", label: "Follow-Up", enabled: false },
  { value: "closing", label: "Closing", enabled: false },
  { value: "objection", label: "Objection Handling", enabled: false },
];

// Fallback scenarios when API is not available
const fallbackScenarios: Scenario[] = [
  {
    id: "discovery-1",
    title: "SaaS Discovery Call",
    description: "Qualify a mid-market prospect evaluating project management tools. Uncover pain points and decision criteria.",
    callType: "discovery",
    difficulty: "Easy",
  },
  {
    id: "demo-1",
    title: "Enterprise Product Demo",
    description: "Deliver a compelling demo to a VP of Sales at a Fortune 500 company. Focus on ROI and integration capabilities.",
    callType: "demo",
    difficulty: "Medium",
  },
  {
    id: "negotiation-1",
    title: "Contract Negotiation",
    description: "Navigate pricing objections and close a multi-year enterprise deal. Handle procurement pushback.",
    callType: "negotiation",
    difficulty: "Hard",
  },
  {
    id: "cold-call-1",
    title: "Outbound Cold Call",
    description: "Break through to a busy decision-maker and earn a 15-minute discovery meeting next week.",
    callType: "cold-call",
    difficulty: "Medium",
  },
  {
    id: "follow-up-1",
    title: "Deal Revival",
    description: "Re-engage a prospect who went dark after a demo. Uncover hidden objections and reset next steps.",
    callType: "follow-up",
    difficulty: "Medium",
  },
  {
    id: "closing-1",
    title: "Final Close Call",
    description: "Handle last-minute objections and get verbal commitment from the economic buyer on a six-figure deal.",
    callType: "closing",
    difficulty: "Expert",
  },
  {
    id: "pitch-easy-1",
    title: "Product Pitch - Easy",
    description: "Deliver a clear product pitch to a curious stakeholder who asks light clarifying questions.",
    callType: "pitch",
    difficulty: "Easy",
  },
  {
    id: "pitch-medium-1",
    title: "Product Pitch - Medium",
    description: "Pitch your product to a practical buyer who asks moderate, business-focused follow-up questions.",
    callType: "pitch",
    difficulty: "Medium",
  },
  {
    id: "pitch-hard-1",
    title: "Product Pitch - Hard",
    description: "Defend your pitch against a skeptical decision-maker who probes assumptions and edge cases.",
    callType: "pitch",
    difficulty: "Hard",
  },
  {
    id: "pitch-expert-1",
    title: "Product Pitch - Expert",
    description: "Handle an intense pitch review where every claim is tested with deep, high-pressure questioning.",
    callType: "pitch",
    difficulty: "Expert",
  },
];

export default function PracticeLibraryPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pitch");

  useEffect(() => {
    async function fetchScenarios() {
      try {
        const res = await fetch("/api/scenarios");
        if (res.ok) {
          const data = await res.json();
          setScenarios(data.scenarios || data);
        } else {
          setScenarios(fallbackScenarios);
        }
      } catch {
        setScenarios(fallbackScenarios);
      } finally {
        setLoading(false);
      }
    }
    fetchScenarios();
  }, []);

  const filteredScenarios = scenarios.filter(
    (s) => s.callType === filter || s.callType === filter.replace("-", "_")
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
          Practice Library
        </h2>
        <p className="text-muted-foreground mt-1">
          Choose a scenario to practice your sales skills
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => opt.enabled && setFilter(opt.value)}
            disabled={!opt.enabled}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all",
              !opt.enabled
                ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                : filter === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm cursor-pointer"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
            )}
          >
            {opt.label}
            {!opt.enabled && (
              <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredScenarios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No scenarios found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for new practice scenarios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredScenarios.map((scenario) => {
            const Icon = callTypeIcons[scenario.callType] || Phone;
            const iconColor = callTypeColors[scenario.callType] || "text-primary";
            const iconBg = callTypeBgColors[scenario.callType] || "bg-primary/10";
            const diffColor = difficultyColors[scenario.difficulty] || "";

            return (
              <Link
                key={scenario.id}
                href={`/practice/${scenario.id}`}
              >
                <Card className="hover:shadow-lg hover:translate-y-[-2px] hover:border-primary/40 transition-all duration-200 cursor-pointer group h-full">
                  <CardHeader className="pb-3">
                    <div
                      className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-200`}
                    >
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {scenario.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed line-clamp-2">
                      {scenario.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={diffColor}>
                          On the Difficulty Level: {getDifficultyDisplayName(scenario.difficulty)}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {(scenario.callType || "").replace(/[-_]/g, " ")}
                        </Badge>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
