"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Full persona library — 69 unique roles, no near-duplicates, all ≤ 14 chars
const PERSONA_POOL = [
  // C-Suite
  "CEO", "CFO", "CTO", "COO", "CMO", "CPO", "CISO", "Founder",
  // Investors & board
  "Investor", "VC Partner", "Board Member", "Angel", "PE Partner",
  // VP level
  "VP Sales", "VP Product", "VP Finance", "VP Ops",
  "VP Engineering", "VP Marketing", "VP Design", "VP Research",
  // Director level
  "Sales Director", "IT Director", "Ops Director", "HR Director", "Legal Director",
  // Manager / Lead level
  "Sales Manager", "Eng Manager", "Prod Manager", "Finance Lead",
  "Ops Manager", "Brand Manager",
  // Decision archetypes
  "Champion", "Gatekeeper", "Skeptic", "Cynic",
  "Influencer", "Blocker", "Evaluator", "Sponsor",
  // Personality archetypes
  "Pragmatist", "Visionary", "Innovator", "Realist", "Risk Averse",
  // Professional roles
  "Analyst", "Consultant", "Advisor", "Auditor", "Regulator",
  "Recruiter", "Researcher", "Procurement", "Legal Counsel", "Compliance Mgr",
  // Technical roles
  "Developer", "Architect", "Data Scientist", "Tech Lead",
  "Security Lead", "Designer", "Power User", "Sys Admin",
  // Finance & business
  "Accountant", "Banker", "Broker", "Risk Analyst", "Controller", "Treasurer",
];

const CYCLE_TICK = 600;  // ms between orb updates (each orb refreshes every 5 × 600 = 3000ms)
const FADE_MS    = 300;  // fade-out duration before name swap
const RECENT_MEM = 20;   // how many retired names to remember across all orbs

/** Pick a random name not in the excluded list. */
function pickRandom(excluded: string[]): string {
  const available = PERSONA_POOL.filter(n => !excluded.includes(n));
  const pool = available.length > 0 ? available : PERSONA_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Generate 5 random non-overlapping starting names. */
function initDisplayed(): string[] {
  const shuffled = [...PERSONA_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

// Pentagon layout: 5 orbs evenly spaced at 72° intervals, radius 110px from center
const aiPersonas = [
  {
    color: "from-red-500 to-rose-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    emoji: "🤨",
    x: 0,    y: -110,
    delay: 0, driftX: 14, driftY: 10, orbitDuration: 6.0,
  },
  {
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    emoji: "👔",
    x: 105,  y: -34,
    delay: 0.2, driftX: 12, driftY: 12, orbitDuration: 7.2,
  },
  {
    color: "from-sky-500 to-blue-600",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    emoji: "📊",
    x: 65,   y: 89,
    delay: 0.4, driftX: 10, driftY: 14, orbitDuration: 5.5,
  },
  {
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    emoji: "🛡️",
    x: -65,  y: 89,
    delay: 0.6, driftX: 13, driftY: 9, orbitDuration: 8.0,
  },
  {
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    emoji: "😊",
    x: -105, y: -34,
    delay: 0.8, driftX: 11, driftY: 13, orbitDuration: 6.8,
  },
];

// Pure display component — receives name and fade state from parent
function PersonaOrb({
  persona,
  index,
  name,
  fadingOut,
}: {
  persona: typeof aiPersonas[0];
  index: number;
  name: string;
  fadingOut: boolean;
}) {
  const { x, y, driftX, driftY, orbitDuration, delay } = persona;

  return (
    <motion.div
      className="absolute"
      initial={{ x, y, rotate: 0 }}
      animate={{
        x: [x, x + driftX, x - driftX * 0.6, x + driftX * 0.3, x],
        y: [y, y - driftY, y + driftY * 0.8, y - driftY * 0.4, y],
        rotate: [0, 3, -2, 2, 0],
      }}
      transition={{
        duration: orbitDuration,
        repeat: Infinity,
        ease: "easeInOut",
        repeatType: "loop",
        delay,
      }}
    >
      {/* Outer glow ring */}
      <motion.div
        className={cn("absolute -inset-2 rounded-full opacity-0", persona.bgColor)}
        animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 3, delay: persona.delay, repeat: Infinity }}
      />

      {/* Main avatar card — fixed width so it never resizes when name changes */}
      <motion.div
        className={cn(
          "relative flex flex-col items-center gap-1 p-3 rounded-2xl backdrop-blur-sm",
          "border shadow-lg w-[84px]",
          persona.borderColor,
          persona.bgColor
        )}
        whileHover={{ scale: 1.1, y: -5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Avatar circle */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-lg",
            "bg-gradient-to-br shadow-md",
            persona.color
          )}
        >
          <span className="drop-shadow-sm">{persona.emoji}</span>
        </div>

        {/* Name container — fixed height absorbs 1-line vs 2-line names without resizing card */}
        <div className="h-[24px] flex items-center justify-center overflow-hidden w-full">
          <span
            className="text-[9px] font-medium text-text-primary w-full text-center break-words leading-tight transition-opacity duration-300"
            style={{ opacity: fadingOut ? 0 : 1 }}
          >
            {name}
          </span>
        </div>

        {/* Activity indicator */}
        <motion.div
          className={cn(
            "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br",
            persona.color
          )}
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, delay: persona.delay + 0.5, repeat: Infinity }}
        />
      </motion.div>
    </motion.div>
  );
}

// Connecting lines from center to each orb's resting position
function ConnectionLines() {
  const connections = [
    { x2: 150, y2: 40  },
    { x2: 255, y2: 116 },
    { x2: 215, y2: 239 },
    { x2: 85,  y2: 239 },
    { x2: 45,  y2: 116 },
  ];

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="var(--primary)" stopOpacity="0.3" />
          <stop offset="50%"  stopColor="var(--accent)"  stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {connections.map((c, i) => (
        <motion.line
          key={i}
          x1={150} y1={150} x2={c.x2} y2={c.y2}
          stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 1, delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
}

export default function PersonasScene() {
  // Refs hold mutable values read inside the interval — avoids stale closure bugs
  const displayedNamesRef = useRef<string[]>(initDisplayed());
  const recentlyUsedRef   = useRef<string[]>([]);
  const orbIdxRef         = useRef(0);

  // State drives rendering
  const [displayedNames, setDisplayedNames] = useState<string[]>(displayedNamesRef.current);
  const [fadingOut,      setFadingOut]      = useState<boolean[]>([false, false, false, false, false]);

  useEffect(() => {
    const id = setInterval(() => {
      const orb = orbIdxRef.current;
      orbIdxRef.current = (orb + 1) % 5;

      // Fade out the orb being updated
      setFadingOut(prev => { const n = [...prev]; n[orb] = true; return n; });

      setTimeout(() => {
        // Exclude currently displayed names + recently retired names
        const excluded = [...displayedNamesRef.current, ...recentlyUsedRef.current];
        const newName  = pickRandom(excluded);
        const oldName  = displayedNamesRef.current[orb];

        // Add retiring name to memory, trim to RECENT_MEM
        recentlyUsedRef.current = [oldName, ...recentlyUsedRef.current].slice(0, RECENT_MEM);

        // Update displayed names
        const next = [...displayedNamesRef.current];
        next[orb] = newName;
        displayedNamesRef.current = next;
        setDisplayedNames([...next]);

        // Fade back in
        setFadingOut(prev => { const n = [...prev]; n[orb] = false; return n; });
      }, FADE_MS);
    }, CYCLE_TICK);

    return () => clearInterval(id);
  }, []); // runs once — all mutable reads go through refs

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <ConnectionLines />

      {aiPersonas.map((persona, i) => (
        <PersonaOrb
          key={i}
          persona={persona}
          index={i}
          name={displayedNames[i]}
          fadingOut={fadingOut[i]}
        />
      ))}

      {/* Center Hub */}
      <motion.div
        className="absolute"
        style={{ x: 0, y: 0 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative">
          {[0, 1].map((ring) => (
            <motion.div
              key={ring}
              className="absolute -inset-4 rounded-full border border-primary/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, delay: ring * 0.5, repeat: Infinity }}
            />
          ))}
        </div>
      </motion.div>

      {/* Ambient background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-56 h-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
          animate={{ opacity: [0.08, 0.12, 0.08], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>
    </div>
  );
}
