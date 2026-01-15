"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, Suspense, lazy } from "react";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { WaveformBackground } from "@/components/ui";

const PersonasScene = lazy(() => import("@/components/3d/personas-scene"));
const AnalysisScene = lazy(() => import("@/components/3d/analysis-scene"));
const ProgressScene = lazy(() => import("@/components/3d/progress-scene"));

const features = [
  {
    title: "5+ AI Personas That Fight Back",
    description:
      "The Skeptical Tech Director. The Aggressive Procurement Officer. The Friendly Gatekeeper. Each with distinct personalities, objection patterns, and emotional triggers.",
    Scene: PersonasScene,
    align: "left" as const,
  },
  {
    title: "Instant Post-Game Analysis",
    description:
      "The moment your call ends, see exactly where you lost momentum, which phrases triggered resistance, and how to reword for impact.",
    Scene: AnalysisScene,
    align: "right" as const,
  },
  {
    title: "Track Your Progress Over Time",
    description:
      "Watch your scores climb. Identify your weak spots. Build practice streaks. Know when you're ready for bigger deals.",
    Scene: ProgressScene,
    align: "left" as const,
  },
];

function FeatureRow({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const isLeft = feature.align === "left";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.2 }}
      className={cn(
        "grid md:grid-cols-12 gap-8 lg:gap-12 items-center",
        index !== 0 && "mt-32 md:mt-40"
      )}
    >
      {/* Content - Asymmetric layout */}
      <motion.div
        className={cn(
          "md:col-span-5 text-left",
          !isLeft && "md:order-2 md:col-start-8"
        )}
        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-text-primary mb-6 leading-tight">
          {feature.title}
        </h3>
        <p className="text-text-secondary text-lg md:text-xl leading-relaxed">
          {feature.description}
        </p>

        {/* Accent line */}
        <motion.div
          className="w-20 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-8"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        />
      </motion.div>

      {/* 3D Scene - Card with frequency border */}
      <motion.div
        className={cn(
          "md:col-span-7 h-[420px] md:h-[450px] relative",
          !isLeft && "md:order-1 md:col-start-1"
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        {/* Frequency rings */}
        <motion.div
          className="absolute inset-0 rounded-3xl border-2 border-primary/20"
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Scene container */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface dark:bg-surface/50 backdrop-blur-sm border border-border shadow-xl">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                </div>
              </div>
            }
          >
            <feature.Scene />
          </Suspense>
        </div>

        {/* Corner accent */}
        <div className="absolute -top-2 -right-2 w-16 h-16 border-t-2 border-r-2 border-accent rounded-tr-2xl opacity-50" />
      </motion.div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="py-24 md:py-32 bg-background-secondary relative overflow-hidden">
      {/* Waveform Background */}
      <WaveformBackground variant="secondary" className="opacity-20" />

      {/* Diagonal accent line */}
      <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-primary/20 via-accent/20 to-primary/20 transform rotate-12 origin-top-right" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - More impactful */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-20 md:mb-32"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <Activity className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-bold tracking-widest uppercase text-primary">
              Powerful Features
            </span>
          </motion.div>

          <h2 className="font-display text-4xl md:text-5xl lg:text-7xl font-extrabold text-text-primary mb-6 leading-tight">
            Built for{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-accent to-primary animate-spectrum-shift bg-clip-text text-transparent">
                Real Results
              </span>
              <motion.div
                className="absolute -bottom-2 left-0 w-full h-4 -z-10 rounded-lg bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 origin-center"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={isInView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </h2>
          <p className="text-text-secondary text-xl md:text-2xl max-w-3xl mx-auto font-medium">
            Every feature designed to make you a{" "}
            <span className="text-primary dark:text-accent font-bold">better closer</span>
          </p>
        </motion.div>

        {/* Feature rows */}
        {features.map((feature, index) => (
          <FeatureRow key={feature.title} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}
