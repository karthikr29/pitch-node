"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type PitchBriefing,
} from "@/lib/validators";
import {
  Briefcase,
  Building2,
  UserCircle,
  Target,
  ArrowRight,
  CheckCircle2,
  ChevronsUpDown,
  Check,
  Shuffle,
  Dices,
  MessageSquareText,
  Loader2,
  UserCheck,
  ChevronLeft,
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
  title: string;
  description: string;
  persona_type: string;
}

const personaTypeLabels: Record<string, string> = {
  skeptical: "Skeptics & Challengers",
  aggressive: "Hard Chargers",
  analytical: "Number Crunchers",
  friendly: "Collaborators",
  indecisive: "Fence-Sitters",
  budget_conscious: "Budget Hawks",
  technical_gatekeeper: "Tech Evaluators",
  committee_buyer: "Committee Buyers",
  internal_champion: "Internal Champions",
  the_ghost: "The Hard-to-Read",
  competitor_loyalist: "Competitor Loyalists",
  the_delegator: "The Delegators",
};

const callTypeDisplayNames: Record<string, string> = {
  cold_call: "Cold Call",
  discovery: "Discovery",
  demo: "Demo",
  objection: "Objection Handling",
  negotiation: "Negotiation",
  follow_up: "Follow-Up",
  closing: "Closing",
  pitch: "Pitch",
};

const pitchHelperText: Record<string, string> = {
  cold_call: "e.g., We sell a cloud-based CRM that helps mid-market sales teams close deals faster...",
  discovery: "e.g., Our AI-powered analytics platform helps marketing teams measure campaign ROI...",
  demo: "e.g., Our project management tool with real-time collaboration and resource planning...",
  objection: "e.g., Enterprise security platform -- prospect concerned about price and switching costs...",
  negotiation: "e.g., Enterprise security platform, quoted at $50K/year, 3-year contract proposed...",
  follow_up: "e.g., The HR automation tool we demoed last month for their onboarding workflow...",
  closing: "e.g., The $120K annual contract for our data warehouse migration solution...",
  pitch: "e.g., AI assistant for B2B sales teams that improves outbound conversion by automating personalization.",
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
    emoji: "\u{1F9D0}",
    title: "VP of Engineering",
    description: "Challenges every claim and demands proof.",
    persona_type: "skeptical",
  },
  {
    id: "persona-2",
    name: "The Busy Exec",
    emoji: "\u23F0",
    title: "CEO",
    description: "Has limited time and low patience. Wants bottom-line value fast.",
    persona_type: "aggressive",
  },
  {
    id: "persona-3",
    name: "The Friendly Guide",
    emoji: "\u{1F60A}",
    title: "Head of Operations",
    description: "Warm and open but needs to be led.",
    persona_type: "friendly",
  },
];

export default function PreCallSetupPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [pitchContext, setPitchContext] = useState("");
  const [pitchBriefing, setPitchBriefing] = useState<PitchBriefing>({
    whatYouSell: "",
    targetAudience: "",
    problemSolved: "",
    valueProposition: "",
    callGoal: "",
    additionalNotes: "",
  });
  const [loading, setLoading] = useState(true);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [inferredRoles, setInferredRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [inferringRole, setInferringRole] = useState(false);
  const lastInferredPayloadRef = useRef<string>("");

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId) ?? null,
    [personas, selectedPersonaId]
  );

  // Group personas by type
  const groupedPersonas = useMemo(() => {
    const groups: Record<string, Persona[]> = {};
    for (const p of personas) {
      const key = p.persona_type || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  }, [personas]);

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
          const raw = data.personas || data;
          setPersonas(
            raw.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: p.name as string,
              emoji: p.emoji as string,
              title: p.title as string || "",
              description: p.description as string,
              persona_type: p.persona_type as string || "other",
            }))
          );
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

  // Role inference — fires on blur of whatYouSell or targetAudience (pitch) / pitchContext textarea (other)
  async function triggerRoleInference() {
    const isPitch = scenario?.callType === "pitch";

    if (isPitch) {
      const what = pitchBriefing.whatYouSell.trim();
      const who = pitchBriefing.targetAudience.trim();

      if (!what || !who) {
        setInferredRoles([]);
        setSelectedRole(null);
        lastInferredPayloadRef.current = "";
        return;
      }

      const payload = JSON.stringify({ whatYouSell: what, targetAudience: who });
      if (payload === lastInferredPayloadRef.current) return;
      lastInferredPayloadRef.current = payload;

      setInferredRoles([]);
      setSelectedRole(null);
      setInferringRole(true);
      try {
        const res = await fetch("/api/voice/infer-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roles) && data.roles.length > 0) {
            setInferredRoles(data.roles);
            setSelectedRole(data.roles[0]);
          }
        }
      } catch {
        // Silent — fallback to DB title at call time
      } finally {
        setInferringRole(false);
      }
    } else {
      const ctx = pitchContext.trim();

      if (!ctx) {
        setInferredRoles([]);
        setSelectedRole(null);
        lastInferredPayloadRef.current = "";
        return;
      }

      const payload = JSON.stringify({ pitchContext: ctx });
      if (payload === lastInferredPayloadRef.current) return;
      lastInferredPayloadRef.current = payload;

      setInferredRoles([]);
      setSelectedRole(null);
      setInferringRole(true);
      try {
        const res = await fetch("/api/voice/infer-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roles) && data.roles.length > 0) {
            setInferredRoles(data.roles);
            setSelectedRole(data.roles[0]);
          }
        }
      } catch {
        // Silent
      } finally {
        setInferringRole(false);
      }
    }
  }

  function handleSurpriseMe() {
    if (personas.length === 0) return;
    const randomIndex = Math.floor(Math.random() * personas.length);
    setSelectedPersonaId(personas[randomIndex].id);
  }

  function handleStartCall() {
    if (!selectedPersonaId) return;
    const selected = personas.find((p) => p.id === selectedPersonaId);
    const personaName = selected?.name || "";
    const personaTitle = selected?.title || "";
    const isPitchCall = scenario?.callType === "pitch";
    const roleForCall = selectedRole || personaTitle;
    let query = `?persona=${selectedPersonaId}&name=${encodeURIComponent(personaName)}&role=${encodeURIComponent(roleForCall)}`;

    if (isPitchCall) {
      sessionStorage.setItem(`pitch-briefing:${scenarioId}`, JSON.stringify(pitchBriefing));
    } else if (pitchContext.trim()) {
      query += `&pitch=${encodeURIComponent(pitchContext.trim())}`;
    }
    router.push(`/practice/${scenarioId}/call${query}`);
  }

  const isPitchCall = scenario?.callType === "pitch";
  const isPitchBriefingValid =
    pitchBriefing.whatYouSell.trim().length > 0 &&
    pitchBriefing.targetAudience.trim().length > 0 &&
    pitchBriefing.problemSolved.trim().length > 0 &&
    pitchBriefing.valueProposition.trim().length > 0 &&
    pitchBriefing.callGoal.trim().length > 0;

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
        <Skeleton className="h-12 w-full sm:w-[400px]" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Scenario not found.</p>
        <Button className="mt-4" asChild>
          <Link href="/practice">Back to Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Back navigation */}
      <Link
        href="/practice"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Practice Library
      </Link>

      {/* Scenario header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {scenario.title}
        </h2>
        <p className="text-muted-foreground mt-1">{scenario.description}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant="outline">
            {getDifficultyDisplayName(scenario.difficulty)}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {callTypeDisplayNames[scenario.callType] || scenario.callType.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {!isPitchCall && <Card>
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
              {callTypeDisplayNames[scenario.callType] || scenario.callType.replace("_", " ")}
            </Badge>
            <Badge variant="outline">
              Difficulty: {getDifficultyDisplayName(scenario.difficulty)}
            </Badge>
          </div>
        </CardContent>
      </Card>}

      {isPitchCall ? (
        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold text-foreground mb-2 flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" />
            Pitch Briefing
          </h3>
          <p className="text-sm text-muted-foreground">
            Fill all required fields so the AI can challenge your real pitch with relevant questions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">What you sell *</label>
              <Input
                value={pitchBriefing.whatYouSell}
                onChange={(e) => setPitchBriefing((prev) => ({ ...prev, whatYouSell: e.target.value.slice(0, 200) }))}
                onBlur={triggerRoleInference}
                placeholder="e.g., AI outbound assistant for sales teams"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Who you sell to *</label>
              <Input
                value={pitchBriefing.targetAudience}
                onChange={(e) => setPitchBriefing((prev) => ({ ...prev, targetAudience: e.target.value.slice(0, 200) }))}
                onBlur={triggerRoleInference}
                placeholder="e.g., B2B SaaS companies, 50-500 employees"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Problem solved *</label>
            <Textarea
              value={pitchBriefing.problemSolved}
              onChange={(e) => setPitchBriefing((prev) => ({ ...prev, problemSolved: e.target.value.slice(0, 300) }))}
              rows={2}
              className="resize-none"
              placeholder="e.g., Low reply rates and slow qualification cycles"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Key value proposition *</label>
            <Textarea
              value={pitchBriefing.valueProposition}
              onChange={(e) => setPitchBriefing((prev) => ({ ...prev, valueProposition: e.target.value.slice(0, 300) }))}
              rows={2}
              className="resize-none"
              placeholder="e.g., 2x meeting conversion with personalized outreach at scale"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Goal of this call *</label>
            <Input
              value={pitchBriefing.callGoal}
              onChange={(e) => setPitchBriefing((prev) => ({ ...prev, callGoal: e.target.value.slice(0, 200) }))}
              placeholder="e.g., Get commitment for a 2-week pilot"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Additional notes (optional)</label>
            <Textarea
              value={pitchBriefing.additionalNotes || ""}
              onChange={(e) => setPitchBriefing((prev) => ({ ...prev, additionalNotes: e.target.value.slice(0, 500) }))}
              rows={3}
              className="resize-none"
              placeholder="Competitor context, pricing anchor, known objections, etc."
            />
            <p className="text-xs text-muted-foreground">
              Required fields are marked with *. All five required fields must be filled before starting the call.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-2 flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" />
            Set the Scene
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Describe what you&apos;re selling so your AI prospect can react realistically. Leave blank for a generic practice session.
          </p>
          <div className="relative">
            <Textarea
              placeholder={pitchHelperText[scenario.callType] || pitchHelperText.discovery}
              value={pitchContext}
              onChange={(e) => setPitchContext(e.target.value.slice(0, 500))}
              onBlur={triggerRoleInference}
              rows={3}
              className="resize-none"
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {pitchContext.length}/500
            </span>
          </div>
        </div>
      )}

      {/* Buyer Role Selection */}
      {(inferringRole || inferredRoles.length > 0) && (
        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {inferringRole ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                Identifying your buyer...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-primary shrink-0" />
                Who will you be pitching to?
              </>
            )}
          </p>
          {!inferringRole && inferredRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {inferredRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
                    selectedRole === role
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Persona Selector */}
      <div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-4">
          Choose Your Opponent
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Combobox */}
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full sm:w-[400px] justify-between h-12 text-left font-normal"
              >
                {selectedPersona ? (
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-medium">{selectedPersona.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Search personas...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] sm:w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search by name or type..." />
                <CommandList>
                  <CommandEmpty>No persona found.</CommandEmpty>

                  {/* Random Pick as first option */}
                  <CommandGroup heading="Quick Pick">
                    <CommandItem
                      onSelect={() => {
                        handleSurpriseMe();
                        setComboboxOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Dices className="mr-2 h-4 w-4 text-primary" />
                      <span className="font-medium text-primary">Random Opponent</span>
                    </CommandItem>
                  </CommandGroup>

                  {/* Grouped personas */}
                  {Object.entries(groupedPersonas).map(([type, groupPersonas]) => (
                    <CommandGroup
                      key={type}
                      heading={personaTypeLabels[type] || type}
                    >
                      {groupPersonas.map((persona) => (
                        <CommandItem
                          key={persona.id}
                          value={`${persona.name} ${persona.persona_type}`}
                          onSelect={() => {
                            setSelectedPersonaId(persona.id);
                            setComboboxOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <span className="font-medium truncate">{persona.name}</span>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              selectedPersonaId === persona.id
                                ? "opacity-100 text-primary"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Surprise Me Button */}
          <Button
            variant="outline"
            onClick={handleSurpriseMe}
            className="h-12 px-6 border-primary/50 hover:bg-primary/10 text-primary shrink-0"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Surprise Me
          </Button>
        </div>

        {/* Selected Persona Preview */}
        {selectedPersona && (
          <Card className="mt-4 border-l-4 border-l-primary animate-in fade-in slide-in-from-top-2 duration-300">
            <CardContent className="pt-6">
              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-foreground">
                  {selectedPersona.name}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {personaTypeLabels[selectedPersona.persona_type] || selectedPersona.persona_type}
                </Badge>
                <p className="text-sm text-foreground leading-relaxed pt-1">
                  {selectedPersona.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky CTA bar — fixed to bottom, unaffected by page content changes */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-end gap-4">
          {!selectedPersonaId && (
            <span className="text-sm text-muted-foreground">
              Select an opponent to continue
            </span>
          )}
          {selectedPersonaId && isPitchCall && !isPitchBriefingValid && (
            <span className="text-sm text-muted-foreground">
              Fill all required fields to start
            </span>
          )}
          <Button
            size="lg"
            onClick={handleStartCall}
            disabled={!selectedPersonaId || (isPitchCall && !isPitchBriefingValid)}
            className="px-8 group"
          >
            Start Call
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
