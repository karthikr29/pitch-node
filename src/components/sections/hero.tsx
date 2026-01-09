"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Suspense, lazy } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { WaitlistCounter } from "./waitlist-counter";

const HeroScene = lazy(() => import("@/components/3d/hero-scene"));

interface HeroProps {
  onOpenWaitlist: () => void;
}

export function Hero({ onOpenWaitlist }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 bg-background-primary">
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl opacity-50" />
        <div className="absolute bottom-20 right-20 w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl opacity-50" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            {/* Coming Soon Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-6"
            >
              <span
                className={cn(
                  "relative inline-flex items-center gap-2",
                  "px-4 py-2 rounded-full",
                  "border text-sm font-medium",
                  "bg-primary/10 border-primary/20 text-primary"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Coming Soon
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-text-primary leading-[1.1] mb-6"
            >
              Master Every Sales Conversation{" "}
              <span className="relative inline-block">
                <span className="text-primary">Before</span>
                <motion.div
                  className="absolute -bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                />
              </span>{" "}
              It Happens
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Practice live sales calls against AI opponents who push back,
              challenge you, and make you better. Prove you&apos;re ready before real
              deals are on the line.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <Button size="lg" onClick={onOpenWaitlist} className="group">
                Join the Waitlist
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <p className="text-text-muted text-sm">
                Be first to access when we launch
              </p>
            </motion.div>
            
            <div className="mt-8 flex justify-center lg:justify-start">
               <WaitlistCounter />
            </div>
          </div>

          {/* 3D Scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative h-[400px] lg:h-[500px] order-first lg:order-last"
          >
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              }
            >
              <HeroScene />
            </Suspense>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-border flex items-start justify-center p-2"
        >
          <motion.div className="w-1 h-2 bg-text-muted rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
