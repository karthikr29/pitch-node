"use client";

import { motion } from "framer-motion";

// CSS-based 3D-style hero scene (can be replaced with Spline)
export default function HeroScene() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Sound wave rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-primary/20"
          style={{
            width: `${200 + i * 80}px`,
            height: `${200 + i * 80}px`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 3,
            delay: i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Main microphone container */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -10, 0],
          rotateY: [0, 360],
        }}
        transition={{
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      >
        {/* Microphone body */}
        <div className="relative w-32 h-48">
          {/* Mic head */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-32 rounded-t-full bg-gradient-to-b from-primary to-primary-hover shadow-lg">
            {/* Grill pattern */}
            <div className="absolute inset-4 rounded-t-full bg-gradient-to-b from-black/20 to-black/40">
              <div
                className="w-full h-full rounded-t-full opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
                }}
              />
            </div>
          </div>

          {/* Mic body/handle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-20 bg-gradient-to-b from-stone-700 to-stone-800 rounded-b-lg shadow-md" />

          {/* Ring detail */}
          <div className="absolute top-[7.5rem] left-1/2 -translate-x-1/2 w-12 h-3 bg-accent rounded-full shadow-sm" />
        </div>

        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
      </motion.div>

      {/* Floating particles - using fixed positions to avoid hydration mismatch */}
      {[
        { left: 25, top: 30, duration: 2.5, delay: 0.3 },
        { left: 70, top: 45, duration: 3.2, delay: 0.8 },
        { left: 40, top: 65, duration: 2.8, delay: 1.2 },
        { left: 60, top: 25, duration: 3.5, delay: 0.5 },
        { left: 35, top: 55, duration: 2.2, delay: 1.5 },
        { left: 75, top: 70, duration: 3.0, delay: 0.1 },
      ].map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/40"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
