"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Presentation,
  Handshake,
  Phone,
  MailCheck,
  BadgeCheck,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  description: string;
  callType: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
}

const callTypeIcons: Record<string, React.ElementType> = {
  discovery: Search,
  demo: Presentation,
  negotiation: Handshake,
  "cold-call": Phone,
  "follow-up": MailCheck,
  closing: BadgeCheck,
};

const callTypeColors: Record<string, string> = {
  discovery: "text-blue-500",
  demo: "text-purple-500",
  negotiation: "text-green-500",
  "cold-call": "text-orange-500",
  "follow-up": "text-teal-500",
  closing: "text-red-500",
};

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/10 text-green-600 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Hard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Expert: "bg-red-500/10 text-red-600 border-red-500/20",
};

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
];

export default function PracticeLibraryPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Practice Library
        </h2>
        <p className="text-muted-foreground mt-1">
          Choose a scenario to practice your sales skills
        </p>
      </div>

      {scenarios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No scenarios available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for new practice scenarios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => {
            const Icon = callTypeIcons[scenario.callType] || Phone;
            const iconColor = callTypeColors[scenario.callType] || "text-primary";
            const diffColor = difficultyColors[scenario.difficulty] || "";

            return (
              <Link
                key={scenario.id}
                href={`/dashboard/practice/${scenario.id}`}
              >
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <CardTitle className="text-base">{scenario.title}</CardTitle>
                    <CardDescription>{scenario.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={diffColor}
                      >
                        {scenario.difficulty}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {scenario.callType.replace("-", " ")}
                      </Badge>
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
