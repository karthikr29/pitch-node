"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface VoiceVisualizerProps {
  mode: "ai" | "user" | "idle";
  barCount?: number;
  className?: string;
}

export function VoiceVisualizer({
  mode,
  barCount = 12,
  className,
}: VoiceVisualizerProps) {
  // We use a set of bars to create the waveform
  // The center bars should generally be taller than the edges for a "bell curve" look

  const getAnimationProps = (index: number) => {
    // Calculate a "base height" multiplier based on distance from center
    // Center bars (index ~ barCount/2) are taller
    const center = barCount / 2;
    const distance = Math.abs(index - center);
    const normalizedDist = 1 - distance / center; // 1 at center, 0 at edges
    const baseHeight = 20 + normalizedDist * 80; // Min 20%, Max 100%

    if (mode === "idle") {
      return {
        height: [baseHeight * 0.2, baseHeight * 0.3, baseHeight * 0.2],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.1,
        },
      };
    }

    if (mode === "ai") {
        // AI Speaking: Active, rhythmic, high amplitude
      return {
        height: [
          baseHeight * 0.3, 
          baseHeight * 1.2, 
          baseHeight * 0.5, 
          baseHeight * 1.0, 
          baseHeight * 0.3
        ],
        transition: {
          duration: 0.5 + Math.random() * 0.3, // Fast, variable
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.05,
          repeatType: "mirror" as const,
        },
      };
    }

    // User Speaking: slightly more chaotic/organic, maybe slightly lower max amplitude
    return {
      height: [
        baseHeight * 0.2, 
        baseHeight * 0.8, 
        baseHeight * 0.4, 
        baseHeight * 0.9, 
        baseHeight * 0.2
      ],
      transition: {
        duration: 0.4 + Math.random() * 0.4,
        repeat: Infinity,
        ease: "easeOut",
        delay: Math.random() * 0.2, // Random phasing for "organic" mic feel
         repeatType: "mirror" as const,
      },
    };
  };

  return (
    <div className={cn("flex items-center justify-center gap-1.5 h-32", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-2.5 rounded-full transition-colors duration-300",
            mode === "ai" ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : 
            mode === "user" ? "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" : 
            "bg-slate-600/50"
          )}
          initial={{ height: "10%" }}
          animate={getAnimationProps(i).height as any}
          transition={getAnimationProps(i).transition as any}
          style={{
             // Ensure we don't exceed container height visually if values go > 100%
             maxHeight: "100%"
          }}
        />
      ))}
    </div>
  );
}
