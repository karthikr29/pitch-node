"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, Suspense, lazy } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const PersonasScene = lazy(() => import("@/components/3d/personas-scene"));
const AnalysisScene = lazy(() => import("@/components/3d/analysis-scene"));
const ProgressScene = lazy(() => import("@/components/3d/progress-scene"));

const features = [
  {
    title: "10+ AI Personas That Fight Back",
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
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={cn(
        "grid md:grid-cols-2 gap-8 lg:gap-16 items-center",
        index !== 0 && "mt-24 md:mt-32"
      )}
    >
      {/* Content */}
      <div
        className={cn(
          "text-center md:text-left",
          !isLeft && "md:order-2"
        )}
      >
        <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
          {feature.title}
        </h3>
        <p className="text-text-secondary text-lg leading-relaxed">
          {feature.description}
        </p>
      </div>

      {/* 3D Scene */}
      <div
        className={cn(
          "h-[300px] md:h-[400px]",
          !isLeft && "md:order-1"
        )}
      >
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          }
        >
          <feature.Scene />
        </Suspense>
      </div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" ref={ref} className="py-24 md:py-32 bg-background-secondary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl translate-x-1/2" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium mb-6 bg-primary/10 border-primary/20 text-primary"
          >
            <Sparkles className="w-4 h-4" />
            Powerful Features
          </motion.div>
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Built for{" "}
            <span className="relative inline-block">
              <span className="text-primary">Real Results</span>
              <motion.div
                className="absolute bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Every feature designed to make you a better closer
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
