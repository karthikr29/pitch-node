"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { type PitchBriefing } from "@/lib/validators";
import {
  type LucideIcon,
  Search,
  Presentation,
  Handshake,
  Phone,
  MailCheck,
  BadgeCheck,
  Megaphone,
  ShieldAlert,
  MessageSquareText,
  ChevronsUpDown,
  Check,
  Shuffle,
  Loader2,
  UserCheck,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ArrowRight,
  Lock,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  description: string;
  callType: string;
  difficulty: string;
}

interface Persona {
  id: string;
  name: string;
  emoji: string;
  title: string;
  description: string;
  persona_type: string;
  accent: string;
}

const callTypeIcons: Record<string, LucideIcon> = {
  pitch: Megaphone,
  "cold-call": Phone,
  cold_call: Phone,
  discovery: Search,
  demo: Presentation,
  negotiation: Handshake,
  "follow-up": MailCheck,
  follow_up: MailCheck,
  closing: BadgeCheck,
  objection: ShieldAlert,
};

const callTypeColors: Record<string, string> = {
  pitch: "text-cyan-500",
  "cold-call": "text-orange-500",
  cold_call: "text-orange-500",
  discovery: "text-blue-500",
  demo: "text-purple-500",
  negotiation: "text-green-500",
  "follow-up": "text-teal-500",
  follow_up: "text-teal-500",
  closing: "text-red-500",
  objection: "text-amber-500",
};

const callTypeBgColors: Record<string, string> = {
  pitch: "bg-cyan-500/8 dark:bg-cyan-500/15",
  "cold-call": "bg-orange-500/8 dark:bg-orange-500/15",
  cold_call: "bg-orange-500/8 dark:bg-orange-500/15",
  discovery: "bg-blue-500/8 dark:bg-blue-500/15",
  demo: "bg-purple-500/8 dark:bg-purple-500/15",
  negotiation: "bg-green-500/8 dark:bg-green-500/15",
  "follow-up": "bg-teal-500/8 dark:bg-teal-500/15",
  follow_up: "bg-teal-500/8 dark:bg-teal-500/15",
  closing: "bg-red-500/8 dark:bg-red-500/15",
  objection: "bg-amber-500/8 dark:bg-amber-500/15",
};

const difficultyUnselectedColors: Record<string, string> = {
  easy: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  expert: "bg-red-500/10 text-red-600 border-red-500/20",
};

const difficultySelectedColors: Record<string, string> = {
  easy: "bg-green-600 text-white border-green-600 shadow-sm",
  medium: "bg-amber-500 text-white border-amber-500 shadow-sm",
  hard: "bg-orange-600 text-white border-orange-600 shadow-sm",
  expert: "bg-red-600 text-white border-red-600 shadow-sm",
};

const difficultyConfirmColors: Record<string, string> = {
  easy: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  expert: "bg-red-500/10 text-red-600 border-red-500/20",
};

const difficultyDisplayNames: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

const callTypeDisplayNames: Record<string, string> = {
  pitch: "Pitch",
  "cold-call": "Cold Call",
  cold_call: "Cold Call",
  discovery: "Discovery",
  demo: "Demo",
  negotiation: "Negotiation",
  "follow-up": "Follow-Up",
  follow_up: "Follow-Up",
  closing: "Closing",
  objection: "Objection Handling",
};

const pitchHelperText: Record<string, string> = {
  cold_call: "e.g., We sell a cloud-based CRM that helps mid-market sales teams close deals faster...",
  discovery: "e.g., Our AI-powered analytics platform helps marketing teams measure campaign ROI...",
  demo: "e.g., Our project management tool with real-time collaboration and resource planning...",
  objection: "e.g., Enterprise security platform — prospect concerned about price and switching costs...",
  negotiation: "e.g., Enterprise security platform, quoted at $50K/year, 3-year contract proposed...",
  follow_up: "e.g., The HR automation tool we demoed last month for their onboarding workflow...",
  closing: "e.g., The $120K annual contract for our data warehouse migration solution...",
  pitch: "e.g., AI assistant for B2B sales teams that improves outbound conversion by automating personalization.",
};

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

const callTypeOptions = [
  { value: "pitch", label: "Pitch", enabled: true },
  { value: "cold-call", label: "Cold Call", enabled: false },
  { value: "discovery", label: "Discovery", enabled: false },
  { value: "demo", label: "Demo", enabled: false },
  { value: "negotiation", label: "Negotiation", enabled: false },
  { value: "follow-up", label: "Follow-Up", enabled: false },
  { value: "closing", label: "Closing", enabled: false },
  { value: "objection", label: "Objections", enabled: false },
];

const difficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

const fallbackScenarios: Scenario[] = [
  { id: "pitch-easy-1", title: "Product Pitch - Easy", description: "", callType: "pitch", difficulty: "easy" },
  { id: "pitch-medium-1", title: "Product Pitch - Medium", description: "", callType: "pitch", difficulty: "medium" },
  { id: "pitch-hard-1", title: "Product Pitch - Hard", description: "", callType: "pitch", difficulty: "hard" },
  { id: "pitch-expert-1", title: "Product Pitch - Expert", description: "", callType: "pitch", difficulty: "expert" },
];

const fallbackPersonas: Persona[] = [
  { id: "persona-1", name: "The Skeptic", emoji: "🧐", title: "VP of Engineering", description: "Challenges every claim and demands proof.", persona_type: "skeptical", accent: "" },
  { id: "persona-2", name: "The Busy Exec", emoji: "⏰", title: "CEO", description: "Has limited time and low patience. Wants bottom-line value fast.", persona_type: "aggressive", accent: "" },
  { id: "persona-3", name: "The Friendly Guide", emoji: "😊", title: "Head of Operations", description: "Warm and open but needs to be led.", persona_type: "friendly", accent: "" },
];

export default function PracticeLibraryPage() {
  const router = useRouter();

  const [step, setStep] = useState<"setup" | "confirm">("setup");
  const [selectedCallType, setSelectedCallType] = useState<string>("pitch");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedScenarioId, setResolvedScenarioId] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  const [pitchBriefing, setPitchBriefing] = useState<PitchBriefing>({
    whatYouSell: "",
    targetAudience: "",
    problemSolved: "",
    valueProposition: "",
    callGoal: "",
    additionalNotes: "",
  });
  const [pitchContext, setPitchContext] = useState("");

  const [inferredRoles, setInferredRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [inferringRole, setInferringRole] = useState(false);
  const [inferRoleError, setInferRoleError] = useState(false);
  const lastInferredPayloadRef = useRef<string>("");

  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [commandValue, setCommandValue] = useState("");

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId) ?? null,
    [personas, selectedPersonaId]
  );

  const isPitchCall = selectedCallType === "pitch";

  const isPitchBriefingValid =
    pitchBriefing.whatYouSell.trim().length > 0 &&
    pitchBriefing.targetAudience.trim().length > 0 &&
    pitchBriefing.problemSolved.trim().length > 0 &&
    pitchBriefing.valueProposition.trim().length > 0 &&
    pitchBriefing.callGoal.trim().length > 0;

  const canProceed =
    selectedDifficulty !== null &&
    selectedPersonaId !== null &&
    (!isPitchCall || isPitchBriefingValid);

  useEffect(() => {
    if (comboboxOpen) {
      setCommandValue(
        selectedPersona
          ? `${selectedPersona.name} ${selectedPersona.persona_type}`
          : ""
      );
    }
  }, [comboboxOpen, selectedPersona]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [scenariosRes, personasRes] = await Promise.all([
          fetch("/api/scenarios"),
          fetch("/api/personas"),
        ]);

        if (scenariosRes.ok) {
          const data = await scenariosRes.json();
          const raw = data.scenarios || data;
          setScenarios(
            raw.map((s: Record<string, unknown>) => ({
              id: s.id as string,
              title: (s.title as string) || "",
              description: (s.description as string) || "",
              callType: ((s.call_type || s.callType) as string) || "",
              difficulty: ((s.difficulty as string) || "").toLowerCase(),
            }))
          );
        } else {
          setScenarios(fallbackScenarios);
        }

        if (personasRes.ok) {
          const data = await personasRes.json();
          const raw = data.personas || data;
          setPersonas(
            raw.map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: p.name as string,
              emoji: (p.emoji as string) || "",
              title: (p.title as string) || "",
              description: (p.description as string) || "",
              persona_type: (p.persona_type as string) || "other",
              accent: (p.accent as string) || "",
            }))
          );
        } else {
          setPersonas(fallbackPersonas);
        }
      } catch {
        setScenarios(fallbackScenarios);
        setPersonas(fallbackPersonas);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Read practice-prefill from sessionStorage once data has loaded, then jump to confirm step
  useEffect(() => {
    if (loading) return;
    const raw = sessionStorage.getItem("practice-prefill");
    if (!raw) return;
    sessionStorage.removeItem("practice-prefill");
    try {
      const prefill = JSON.parse(raw) as {
        callType: string;
        difficulty: string;
        scenarioId: string;
        personaId: string;
        pitchBriefing?: Record<string, string>;
        inferredRole?: string | null;
      };
      setSelectedCallType(prefill.callType);
      setSelectedDifficulty(prefill.difficulty);
      setResolvedScenarioId(prefill.scenarioId);
      setSelectedPersonaId(prefill.personaId);
      if (prefill.pitchBriefing) setPitchBriefing(prefill.pitchBriefing as unknown as PitchBriefing);
      if (prefill.inferredRole) setSelectedRole(prefill.inferredRole);
      setStep("confirm");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore malformed data
    }
  }, [loading]);

  function handleCallTypeChange(newType: string) {
    if (newType === selectedCallType) return;
    setSelectedCallType(newType);
    setPitchBriefing({ whatYouSell: "", targetAudience: "", problemSolved: "", valueProposition: "", callGoal: "", additionalNotes: "" });
    setPitchContext("");
    setInferredRoles([]);
    setSelectedRole(null);
    setCustomRoleInput("");
    setInferRoleError(false);
    lastInferredPayloadRef.current = "";
  }

  async function triggerRoleInference() {
    if (isPitchCall) {
      const what = pitchBriefing.whatYouSell.trim();
      const who = pitchBriefing.targetAudience.trim();

      if (!what || !who) {
        setInferredRoles([]);
        setSelectedRole(null);
        setCustomRoleInput("");
        setInferRoleError(false);
        lastInferredPayloadRef.current = "";
        return;
      }

      const payload = JSON.stringify({ whatYouSell: what, targetAudience: who });
      if (payload === lastInferredPayloadRef.current) return;
      lastInferredPayloadRef.current = payload;

      setInferredRoles([]);
      setSelectedRole(null);
      setCustomRoleInput("");
      setInferRoleError(false);
      setInferringRole(true);
      let succeeded = false;
      for (let attempt = 0; attempt < 2; attempt++) {
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
            succeeded = true;
            break;
          }
        } catch {
          // try next attempt
        }
      }
      if (!succeeded) setInferRoleError(true);
      setInferringRole(false);
    } else {
      const ctx = pitchContext.trim();

      if (!ctx) {
        setInferredRoles([]);
        setSelectedRole(null);
        setCustomRoleInput("");
        setInferRoleError(false);
        lastInferredPayloadRef.current = "";
        return;
      }

      const payload = JSON.stringify({ pitchContext: ctx });
      if (payload === lastInferredPayloadRef.current) return;
      lastInferredPayloadRef.current = payload;

      setInferredRoles([]);
      setSelectedRole(null);
      setCustomRoleInput("");
      setInferRoleError(false);
      setInferringRole(true);
      let succeeded = false;
      for (let attempt = 0; attempt < 2; attempt++) {
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
            succeeded = true;
            break;
          }
        } catch {
          // try next attempt
        }
      }
      if (!succeeded) setInferRoleError(true);
      setInferringRole(false);
    }
  }

  function retryInferRole() {
    lastInferredPayloadRef.current = "";
    triggerRoleInference();
  }

  function handleSurpriseMe() {
    if (personas.length === 0) return;
    const randomIndex = Math.floor(Math.random() * personas.length);
    setSelectedPersonaId(personas[randomIndex].id);
  }

  function handleNext() {
    if (!canProceed) return;
    setScenarioError(null);

    const scenario = scenarios.find(
      (s) =>
        (s.callType === selectedCallType ||
          s.callType === selectedCallType.replace("-", "_")) &&
        s.difficulty === selectedDifficulty
    );

    if (!scenario) {
      setScenarioError("No scenario found for this combination. Please try a different difficulty.");
      return;
    }

    setResolvedScenarioId(scenario.id);
    setStep("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleStartSession() {
    if (!resolvedScenarioId || !selectedPersonaId) return;
    const persona = personas.find((p) => p.id === selectedPersonaId);
    const personaName = persona?.name || "";
    const personaTitle = persona?.title || "";
    const roleForCall = selectedRole || personaTitle;

    if (isPitchCall) {
      sessionStorage.setItem(
        `pitch-briefing:${resolvedScenarioId}`,
        JSON.stringify(pitchBriefing)
      );
    }

    let query = `?persona=${selectedPersonaId}&name=${encodeURIComponent(personaName)}&role=${encodeURIComponent(roleForCall)}`;
    if (!isPitchCall && pitchContext.trim()) {
      query += `&pitch=${encodeURIComponent(pitchContext.trim())}`;
    }

    router.push(`/practice/${resolvedScenarioId}/call${query}`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="flex gap-8">
          <div className="w-[190px] shrink-0 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Confirmation step
  if (step === "confirm") {
    const CallIcon = callTypeIcons[selectedCallType] || Megaphone;
    const iconColor = callTypeColors[selectedCallType] || "text-primary";
    const iconBg = callTypeBgColors[selectedCallType] || "bg-primary/10";
    const diffColor = selectedDifficulty ? difficultyConfirmColors[selectedDifficulty] : "";
    const diffLabel = selectedDifficulty ? difficultyDisplayNames[selectedDifficulty] : "";

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <button
          onClick={() => setStep("setup")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to setup
        </button>

        <div>
          <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Ready to start?
          </h2>
          <p className="text-muted-foreground mt-1">
            Review your session details and start when ready.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Call type + difficulty */}
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                <CallIcon className={cn("w-5 h-5", iconColor)} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground leading-none">
                  {callTypeDisplayNames[selectedCallType] || selectedCallType}
                </p>
                {selectedDifficulty && (
                  <Badge variant="outline" className={cn("text-xs", diffColor)}>
                    {diffLabel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Pitch Briefing — all fields */}
            {isPitchCall && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pitch Briefing</p>
                {[
                  { label: "What you sell", value: pitchBriefing.whatYouSell },
                  { label: "Who you sell to", value: pitchBriefing.targetAudience },
                  { label: "Problem solved", value: pitchBriefing.problemSolved },
                  { label: "Key value proposition", value: pitchBriefing.valueProposition },
                  { label: "Goal of this call", value: pitchBriefing.callGoal },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
                  </div>
                ))}
                {pitchBriefing.additionalNotes?.trim() && (
                  <div>
                    <p className="text-xs text-muted-foreground">Additional notes</p>
                    <p className="text-sm text-foreground mt-0.5">{pitchBriefing.additionalNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Non-pitch context */}
            {!isPitchCall && pitchContext.trim() && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Context</p>
                <p className="text-sm text-foreground">{pitchContext}</p>
              </div>
            )}

            {/* Buyer Role */}
            {selectedRole && (
              <>
                <div className="border-t border-border" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Buyer Role</p>
                  <p className="text-sm text-foreground">{selectedRole}</p>
                </div>
              </>
            )}

            <div className="border-t border-border" />

            {/* Opponent / Persona */}
            {selectedPersona && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Opponent</p>
                <div>
                  <p className="font-medium text-foreground">{selectedPersona.name}</p>
                  {selectedPersona.title && (
                    <p className="text-sm text-muted-foreground">{selectedPersona.title}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <Badge variant="outline" className="text-xs">
                      {personaTypeLabels[selectedPersona.persona_type] || selectedPersona.persona_type}
                    </Badge>
                    {selectedPersona.accent && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {selectedPersona.accent} accent
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {selectedPersona.description}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button size="lg" onClick={handleStartSession} className="w-full group">
          Start Session
          <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    );
  }

  // Setup step
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
          Practice Library
        </h2>
        <p className="text-muted-foreground mt-1">
          Choose a call type and fill in your details to start a session.
        </p>
      </div>

      <div className="flex gap-0 items-start">
        {/* Left sidebar: Call Type */}
        <aside className="w-[196px] shrink-0 border-r border-border pr-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Call Type
          </p>
          <nav className="space-y-0.5">
            {callTypeOptions.map((opt) => {
              const Icon = callTypeIcons[opt.value] || Phone;
              const iconColor = callTypeColors[opt.value] || "text-primary";
              const iconBg = callTypeBgColors[opt.value] || "bg-primary/10";
              const isSelected = selectedCallType === opt.value;

              return (
                <button
                  key={opt.value}
                  onClick={() => opt.enabled && handleCallTypeChange(opt.value)}
                  disabled={!opt.enabled}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all",
                    opt.enabled
                      ? isSelected
                        ? "bg-primary/10 text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground cursor-pointer"
                      : "text-muted-foreground/35 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-md shrink-0 transition-all",
                      opt.enabled
                        ? isSelected
                          ? iconBg
                          : "bg-muted/30"
                        : "bg-muted/15"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        opt.enabled
                          ? isSelected ? iconColor : "text-muted-foreground/60"
                          : "text-muted-foreground/25"
                      )}
                    />
                  </span>
                  <span className="truncate">{opt.label}</span>
                  {!opt.enabled && (
                    <Lock className="w-3 h-3 ml-auto shrink-0 text-muted-foreground/30" />
                  )}
                  {opt.enabled && isSelected && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right panel */}
        <div className="flex-1 min-w-0 space-y-6 pl-8">

      {/* Section 2: Difficulty */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Difficulty
        </h3>
        <div className="flex flex-wrap gap-2">
          {difficultyOptions.map((opt) => {
            const isSelected = selectedDifficulty === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedDifficulty(opt.value)}
                className={cn(
                  "inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer",
                  isSelected
                    ? difficultySelectedColors[opt.value]
                    : cn(difficultyUnselectedColors[opt.value], "hover:opacity-80")
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Questionnaire + Persona */}
      <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-300">
        {/* Questionnaire */}
        {isPitchCall ? (
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
                <MessageSquareText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pitch Briefing</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fill all required fields so the AI can challenge your real pitch.
                </p>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What you sell <span className="text-primary/80 normal-case">*</span>
                  </label>
                  <Input
                    value={pitchBriefing.whatYouSell}
                    onChange={(e) => setPitchBriefing((prev) => ({ ...prev, whatYouSell: e.target.value.slice(0, 500) }))}
                    onBlur={triggerRoleInference}
                    placeholder="e.g., AI outbound assistant for sales teams"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Who you sell to <span className="text-primary/80 normal-case">*</span>
                  </label>
                  <Input
                    value={pitchBriefing.targetAudience}
                    onChange={(e) => setPitchBriefing((prev) => ({ ...prev, targetAudience: e.target.value.slice(0, 500) }))}
                    onBlur={triggerRoleInference}
                    placeholder="e.g., B2B SaaS companies, 50–500 employees"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Problem solved <span className="text-primary/80 normal-case">*</span>
                </label>
                <Textarea
                  value={pitchBriefing.problemSolved}
                  onChange={(e) => setPitchBriefing((prev) => ({ ...prev, problemSolved: e.target.value.slice(0, 500) }))}
                  rows={2}
                  className="resize-none"
                  placeholder="e.g., Low reply rates and slow qualification cycles"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Key value proposition <span className="text-primary/80 normal-case">*</span>
                </label>
                <Textarea
                  value={pitchBriefing.valueProposition}
                  onChange={(e) => setPitchBriefing((prev) => ({ ...prev, valueProposition: e.target.value.slice(0, 500) }))}
                  rows={2}
                  className="resize-none"
                  placeholder="e.g., 2x meeting conversion with personalized outreach at scale"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Goal of this call <span className="text-primary/80 normal-case">*</span>
                </label>
                <Input
                  value={pitchBriefing.callGoal}
                  onChange={(e) => setPitchBriefing((prev) => ({ ...prev, callGoal: e.target.value.slice(0, 300) }))}
                  placeholder="e.g., Get commitment for a 2-week pilot"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Additional notes{" "}
                  <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <Textarea
                  value={pitchBriefing.additionalNotes || ""}
                  onChange={(e) => setPitchBriefing((prev) => ({ ...prev, additionalNotes: e.target.value.slice(0, 1000) }))}
                  rows={3}
                  className="resize-none"
                  placeholder="Competitor context, pricing anchor, known objections, etc."
                />
                <p className="text-xs text-muted-foreground">Fields marked * are required.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
                <MessageSquareText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Set the Scene</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe what you&apos;re selling so your AI prospect can react realistically.
                </p>
              </div>
            </div>

            {/* Card body */}
            <div className="p-5">
              <div className="relative">
                <Textarea
                  placeholder={pitchHelperText[selectedCallType.replace("-", "_")] || pitchHelperText.discovery}
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
          </div>
        )}

        {/* Buyer Role Inference */}
        {(inferringRole || inferredRoles.length > 0 || inferRoleError) && (
          <div className="space-y-2.5">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {inferringRole ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Identifying your buyer...
                </>
              ) : inferRoleError ? (
                <>
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-destructive">Couldn&apos;t identify buyer role.</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-primary shrink-0" />
                  Who will you be pitching to?
                </>
              )}
            </p>
            {!inferringRole && inferRoleError && (
              <button
                type="button"
                onClick={retryInferRole}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            )}
            {!inferringRole && inferredRoles.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  {inferredRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => { setSelectedRole(role); setCustomRoleInput(""); }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
                        selectedRole === role && !customRoleInput
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground shrink-0 font-medium">or</span>
                  <Input
                    placeholder="Enter your own role…"
                    value={customRoleInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomRoleInput(val);
                      setSelectedRole(val.trim() || null);
                    }}
                    className="h-8 text-sm max-w-[260px]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Persona Selector */}
        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <UserCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Choose Your Opponent</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick a persona or let us surprise you.
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
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
                  <Command value={commandValue} onValueChange={setCommandValue}>
                    <CommandInput placeholder="Search by name or type..." />
                    <CommandList>
                      <CommandEmpty>No persona found.</CommandEmpty>
                      <CommandGroup>
                        {personas.map((persona) => (
                          <CommandItem
                            key={persona.id}
                            value={`${persona.name} ${persona.persona_type}`}
                            onSelect={() => {
                              setSelectedPersonaId(persona.id);
                              setComboboxOpen(false);
                            }}
                            className="cursor-pointer group"
                          >
                            <div className="flex items-center justify-between w-full min-w-0">
                              <span className="font-medium truncate">{persona.name}</span>
                              <span className="text-xs text-muted-foreground/70 ml-3 shrink-0 italic group-data-[selected=true]:text-accent-foreground/70">
                                {persona.accent
                                  ? `${persona.accent.charAt(0).toUpperCase() + persona.accent.slice(1)} · `
                                  : ""}
                                {personaTypeLabels[persona.persona_type] || persona.persona_type}
                              </span>
                            </div>
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4 shrink-0",
                                selectedPersonaId === persona.id
                                  ? "opacity-100 text-primary group-data-[selected=true]:text-accent-foreground"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                onClick={handleSurpriseMe}
                className="h-12 px-6 border-primary/50 hover:bg-primary/10 text-primary shrink-0"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Surprise Me
              </Button>
            </div>

            {selectedPersona && (
              <div className="rounded-lg border border-border bg-background/50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">
                      {selectedPersona.name}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge variant="outline" className="text-xs">
                        {personaTypeLabels[selectedPersona.persona_type] || selectedPersona.persona_type}
                      </Badge>
                      {selectedPersona.accent && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {selectedPersona.accent} accent
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {selectedPersona.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scenario lookup error */}
        {scenarioError && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {scenarioError}
          </p>
        )}

        {/* Next button + helper text */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {!selectedDifficulty
              ? "Select a difficulty to continue"
              : !selectedPersonaId
                ? "Select an opponent to continue"
                : isPitchCall && !isPitchBriefingValid
                  ? "Fill all required fields to continue"
                  : null}
          </span>
          <Button
            size="lg"
            onClick={handleNext}
            disabled={!canProceed}
            className="ml-auto group"
          >
            Next
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
        </div>{/* end right panel */}
      </div>{/* end flex wrapper */}
    </div>
  );
}
