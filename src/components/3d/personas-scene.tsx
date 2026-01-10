"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Each persona represents a different AI opponent personality
const aiPersonas = [
  {
    name: "Skeptic",
    color: "from-red-500 to-rose-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    emoji: "🤨",
    x: -80,
    y: 0,
    delay: 0
  },
  {
    name: "Executive",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    emoji: "👔",
    x: 80,
    y: -30,
    delay: 0.2
  },
  {
    name: "Analyst",
    color: "from-sky-500 to-blue-600",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    emoji: "📊",
    x: 0,
    y: 50,
    delay: 0.4
  },
  {
    name: "Gatekeeper",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    emoji: "🛡️",
    x: -50,
    y: -60,
    delay: 0.6
  },
  {
    name: "Friend",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    emoji: "😊",
    x: 70,
    y: 40,
    delay: 0.8
  },
];

function PersonaOrb({ persona, index }: { persona: typeof aiPersonas[0]; index: number }) {
  const isCenter = index === 2;

  return (
    <motion.div
      className="absolute"
      style={{ x: persona.x, y: persona.y }}
      animate={{
        y: [persona.y, persona.y - 12, persona.y],
      }}
      transition={{
        y: {
          duration: 3 + index * 0.3,
          delay: persona.delay,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      {/* Outer glow ring */}
      <motion.div
        className={cn(
          "absolute -inset-2 rounded-full opacity-0",
          persona.bgColor
        )}
        animate={{
          opacity: [0, 0.5, 0],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 3,
          delay: persona.delay,
          repeat: Infinity,
        }}
      />

      {/* Main avatar card */}
      <motion.div
        className={cn(
          "relative flex flex-col items-center gap-1 p-3 rounded-2xl backdrop-blur-sm",
          "border shadow-lg",
          persona.borderColor,
          persona.bgColor,
          isCenter && "scale-110"
        )}
        whileHover={{ scale: 1.1, y: -5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Avatar circle */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-lg",
          "bg-gradient-to-br shadow-md",
          persona.color
        )}>
          <span className="drop-shadow-sm">{persona.emoji}</span>
        </div>

        {/* Name label */}
        <span className="text-[10px] font-medium text-text-primary whitespace-nowrap">
          {persona.name}
        </span>

        {/* Activity indicator */}
        <motion.div
          className={cn(
            "absolute -top-1 -right-1 w-3 h-3 rounded-full",
            "bg-gradient-to-br",
            persona.color
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            delay: persona.delay + 0.5,
            repeat: Infinity,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// Connecting lines between personas
function ConnectionLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Connection from center to each persona */}
      {[
        { x1: 0, y1: 50, x2: -80, y2: 0 },
        { x1: 0, y1: 50, x2: 80, y2: -30 },
        { x1: 0, y1: 50, x2: -50, y2: -60 },
        { x1: 0, y1: 50, x2: 70, y2: 40 },
      ].map((line, i) => (
        <motion.line
          key={i}
          x1={150 + line.x1}
          y1={150 + line.y1}
          x2={150 + line.x2}
          y2={150 + line.y2}
          stroke="url(#lineGradient)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 1, delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
}

export default function PersonasScene() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Connection lines */}
      <ConnectionLines />

      {/* AI Personas */}
      {aiPersonas.map((persona, i) => (
        <PersonaOrb key={persona.name} persona={persona} index={i} />
      ))}

      {/* Center Hub - Neural Network Core */}
      <motion.div
        className="absolute"
        style={{ x: 0, y: 50 }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative">
          {/* Pulse rings */}
          {[0, 1].map((ring) => (
            <motion.div
              key={ring}
              className="absolute -inset-4 rounded-full border border-primary/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                delay: ring * 0.5,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Ambient background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-56 h-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
          animate={{
            opacity: [0.08, 0.12, 0.08],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
        />
      </div>
    </div>
  );
}
