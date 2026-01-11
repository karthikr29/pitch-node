"use client";

import { motion } from "framer-motion";
import { Button, WaveformBackground, FrequencyOrb } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Suspense, lazy } from "react";
import { ArrowRight, Mic2, Activity } from "lucide-react";
import { TypeAnimation } from "react-type-animation";

import { WaitlistCounter } from "./waitlist-counter";

const HeroScene = lazy(() => import("@/components/3d/hero-scene"));

interface HeroProps {
  onOpenWaitlist: () => void;
}

export function Hero({ onOpenWaitlist }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden bg-background-primary">
      {/* Waveform Background - Voice Frequency Aesthetic */}
      <WaveformBackground variant="primary" className="opacity-40" />

      {/* Frequency Orbs - AWS Orange Theme */}
      <div className="absolute top-20 -left-20 opacity-50 dark:opacity-70">
        <FrequencyOrb size="xl" variant="primary" />
      </div>
      <div className="absolute bottom-20 -right-20 opacity-50 dark:opacity-70">
        <FrequencyOrb size="lg" variant="accent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        {/* Asymmetric Grid Layout - Bold & Unconventional */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Content - Spans 7 columns on large screens for asymmetry */}
          <div className="lg:col-span-7 text-left">
            {/* Coming Soon Badge - Redesigned with voice theme */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-6"
            >
              <div className="relative">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/30"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <span className="text-sm font-semibold tracking-wide uppercase text-primary">
                Live Voice Training • Coming Soon
              </span>
            </motion.div>

            {/* Headline - Bold and Impactful */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-text-primary leading-[1.05] mb-6"
            >
              <motion.span
                className="block mb-2"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                Master Every
              </motion.span>

              {/* Animated Text with Voice Wave Effect */}
              <motion.div
                className="relative inline-block mb-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <TypeAnimation
                  sequence={[
                    "Cold Call",
                    2000,
                    "Discovery",
                    2000,
                    "Demo",
                    2000,
                    "Objection",
                    2000,
                    "Negotiation",
                    2000,
                    "Close",
                    2000,
                  ]}
                  wrapper="span"
                  speed={50}
                  className="text-primary dark:text-primary block relative z-10"
                  repeat={Infinity}
                />
                {/* AWS Orange glow effect in dark mode */}
                <motion.div
                  className="absolute inset-0 blur-2xl opacity-0 dark:opacity-50 -z-10"
                  style={{
                    background: "var(--primary)",
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>

              <motion.span
                className="block"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <span className="relative inline-block">
                  <span
                    className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary animate-spectrum-shift bg-clip-text text-transparent"
                    style={{
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                    }}
                  >
                    Before
                  </span>
                  {/* Underline with AWS orange gradient */}
                  <motion.div
                    className="absolute -bottom-2 left-0 w-full h-3 -z-10 rounded-lg animate-spectrum-shift"
                    style={{
                      background: "linear-gradient(90deg, var(--primary), var(--accent), var(--primary))",
                      backgroundSize: "200% 100%",
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 0.4 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                  />
                </span>{" "}
                It Happens
              </motion.span>
            </motion.h1>

            {/* Subheadline - Punchy and Bold */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-lg md:text-xl text-text-secondary max-w-2xl mb-8 leading-relaxed font-medium"
            >
              Practice live sales calls against{" "}
              <span className="text-text-primary font-bold">AI opponents</span> who
              push back, challenge you, and make you better.{" "}
              <span className="text-primary dark:text-accent font-bold">
                Prove you&apos;re ready
              </span>{" "}
              before real deals are on the line.
            </motion.p>

            {/* CTA - Voice-themed button with mic icon */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-start gap-6 mb-6"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  size="lg"
                  onClick={onOpenWaitlist}
                  className="group relative overflow-hidden px-8 py-6 text-lg font-bold shadow-lg dark:shadow-primary/20"
                >
                  <Mic2 className="w-5 h-5 mr-2" />
                  Join the Waitlist
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  {/* Animated background shine */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                    animate={{
                      translateX: ["100%", "100%", "-100%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  />
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-col gap-1"
              >
                <p className="text-text-muted text-sm font-medium">
                  ✓ Early access priority
                </p>
                <p className="text-text-muted text-sm font-medium">
                  ✓ Exclusive launch pricing
                </p>
              </motion.div>
            </motion.div>

            {/* Waitlist Counter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <WaitlistCounter />
            </motion.div>
          </div>

          {/* 3D Scene - Asymmetric placement (5 columns) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative h-[350px] lg:h-[480px]"
          >
            {/* Voice frequency rings around 3D scene */}
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-primary/20"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute inset-[-10px] rounded-3xl border border-accent/20"
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />

            {/* 3D Scene Container */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface/50 dark:bg-surface/10 backdrop-blur-sm border border-border shadow-2xl">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-accent/20"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </div>
                  </div>
                }
              >
                <HeroScene />
              </Suspense>
            </div>

            {/* Floating frequency indicators */}
            <motion.div
              className="absolute -top-4 -right-4 bg-primary/10 dark:bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-4 py-2 flex items-center gap-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{
                      height: ["8px", "20px", "8px"],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-primary">LIVE</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator - Voice wave style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Scroll to explore
        </span>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary/50 rounded-full"
              animate={{
                height: ["12px", "24px", "12px"],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
