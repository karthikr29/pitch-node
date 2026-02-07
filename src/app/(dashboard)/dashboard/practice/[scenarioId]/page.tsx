"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  UserCircle,
  Target,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface ScenarioDetail {
  id: string;
  title: string;
  description: string;
  callType: string;
  difficulty: string;
  context: string;
  company: string;
  prospect: string;
  objectives: string[];
}

interface Persona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
}

const personaBorderColors = [
  "border-blue-500/50 hover:border-blue-500",
  "border-purple-500/50 hover:border-purple-500",
  "border-green-500/50 hover:border-green-500",
  "border-orange-500/50 hover:border-orange-500",
  "border-red-500/50 hover:border-red-500",
];

// Fallback data
const fallbackScenario: ScenarioDetail = {
  id: "discovery-1",
  title: "SaaS Discovery Call",
  description: "Qualify a mid-market prospect evaluating project management tools.",
  callType: "discovery",
  difficulty: "Medium",
  context:
    "You are a sales rep at a B2B SaaS company selling project management software. The prospect is a growing tech startup that is outgrowing their current tooling. They have 150 employees and a budget of $50K/year for productivity tools.",
  company: "TechFlow Solutions (150 employees, Series B)",
  prospect: "Sarah Chen, VP of Operations",
  objectives: [
    "Understand their current project management workflow",
    "Identify top 3 pain points with existing tools",
    "Qualify budget and decision timeline",
    "Book a follow-up demo with the broader team",
  ],
};

const fallbackPersonas: Persona[] = [
  {
    id: "persona-1",
    name: "The Skeptic",
    emoji: "🤨",
    description: "Challenges every claim and demands proof. Tests your product knowledge thoroughly.",
    personality: "Analytical, detail-oriented",
  },
  {
    id: "persona-2",
    name: "The Busy Exec",
    emoji: "⏰",
    description: "Has limited time and low patience. Wants bottom-line value fast.",
    personality: "Direct, time-conscious",
  },
  {
    id: "persona-3",
    name: "The Friendly Guide",
    emoji: "😊",
    description: "Warm and open but needs to be led. Will share information freely.",
    personality: "Collaborative, supportive",
  },
  {
    id: "persona-4",
    name: "The Gatekeeper",
    emoji: "🛡️",
    description: "Protective of their organization. You need to earn trust before they open up.",
    personality: "Cautious, risk-averse",
  },
  {
    id: "persona-5",
    name: "The Competitor Fan",
    emoji: "⚔️",
    description: "Loyal to a competitor. You must differentiate without badmouthing.",
    personality: "Opinionated, loyal",
  },
];

export default function PreCallSetupPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [scenarioRes, personaRes] = await Promise.all([
          fetch(`/api/scenarios/${scenarioId}`),
          fetch("/api/personas"),
        ]);

        if (scenarioRes.ok) {
          const data = await scenarioRes.json();
          const briefing = data.context_briefing || {};
          setScenario({
            id: data.id,
            title: data.title,
            description: data.description,
            callType: data.call_type || data.callType || "",
            difficulty: data.difficulty,
            context: briefing.context || briefing.scenario || data.description,
            company: briefing.company || "N/A",
            prospect: briefing.prospect || "N/A",
            objectives: data.objectives || [],
          });
        } else {
          setScenario({ ...fallbackScenario, id: scenarioId });
        }

        if (personaRes.ok) {
          const data = await personaRes.json();
          setPersonas(data.personas || data);
        } else {
          setPersonas(fallbackPersonas);
        }
      } catch {
        setScenario({ ...fallbackScenario, id: scenarioId });
        setPersonas(fallbackPersonas);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [scenarioId]);

  function handleStartCall() {
    const query = selectedPersona ? `?persona=${selectedPersona}` : "";
    router.push(`/dashboard/practice/${scenarioId}/call${query}`);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Scenario not found.</p>
        <Button className="mt-4" asChild>
          <a href="/dashboard/practice">Back to Library</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Scenario Briefing */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {scenario.title}
        </h2>
        <p className="text-muted-foreground mt-1">{scenario.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Scenario Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            {scenario.context}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Company
                </p>
                <p className="text-sm text-foreground">{scenario.company}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Prospect
                </p>
                <p className="text-sm text-foreground">{scenario.prospect}</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Objectives
              </p>
            </div>
            <ul className="space-y-2">
              {scenario.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <Badge variant="outline" className="capitalize">
              {scenario.callType.replace("-", " ")}
            </Badge>
            <Badge variant="outline">{scenario.difficulty}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Persona Selector */}
      <div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-4">
          Choose Your Opponent
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona, index) => {
            const isSelected = selectedPersona === persona.id;
            const borderColor = personaBorderColors[index % personaBorderColors.length];

            return (
              <Card
                key={persona.id}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  borderColor,
                  isSelected && "ring-2 ring-primary shadow-md"
                )}
                onClick={() => setSelectedPersona(persona.id)}
              >
                <CardContent className="pt-6">
                  <div className="text-3xl mb-3">{persona.emoji}</div>
                  <CardTitle className="text-base mb-1">{persona.name}</CardTitle>
                  <CardDescription className="text-xs mb-2">
                    {persona.personality}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground">
                    {persona.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Start Call */}
      <div className="flex justify-center pb-8">
        <Button
          size="lg"
          onClick={handleStartCall}
          disabled={!selectedPersona}
          className="px-8 group"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Start Call
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
