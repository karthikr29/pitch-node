"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const personas = [
  { color: "bg-primary", delay: 0, x: -60, y: 0 },
  { color: "bg-accent", delay: 0.2, x: 60, y: -20 },
  { color: "bg-success", delay: 0.4, x: 0, y: 40 },
  { color: "bg-error", delay: 0.6, x: -40, y: -50 },
  { color: "bg-text-muted", delay: 0.8, x: 80, y: 30 },
];

export default function PersonasScene() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Chess-piece style personas */}
      {personas.map((persona, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ x: persona.x, y: persona.y }}
          animate={{
            y: [persona.y, persona.y - 15, persona.y],
            rotateY: [0, 180, 360],
          }}
          transition={{
            y: {
              duration: 3,
              delay: persona.delay,
              repeat: Infinity,
              ease: "easeInOut",
            },
            rotateY: {
              duration: 8,
              delay: persona.delay,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {/* Pawn-like shape */}
          <div className={cn("relative", i === 2 && "scale-125")}>
            {/* Head */}
            <div
              className={cn(
                "w-10 h-10 rounded-full shadow-lg",
                persona.color
              )}
            />
            {/* Neck */}
            <div
              className={cn(
                "w-4 h-4 mx-auto -mt-1",
                persona.color,
                "opacity-80"
              )}
            />
            {/* Body */}
            <div
              className={cn(
                "w-12 h-8 mx-auto -mt-1 rounded-t-lg",
                persona.color,
                "opacity-70"
              )}
            />
            {/* Base */}
            <div
              className={cn(
                "w-16 h-3 mx-auto -mt-1 rounded-full",
                persona.color,
                "opacity-60"
              )}
            />
          </div>
        </motion.div>
      ))}

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
