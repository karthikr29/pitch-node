"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, Suspense, lazy } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Zap, Target, Mic, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui";

// Lazy load the 3D scenes for performance
const PickBattleScene = lazy(() => import("@/components/3d/how-it-works/pick-battle-scene"));
const FaceAiScene = lazy(() => import("@/components/3d/how-it-works/face-ai-scene"));
const LevelUpScene = lazy(() => import("@/components/3d/how-it-works/level-up-scene"));

interface HowItWorksProps {
  onOpenWaitlist: () => void;
}

const steps = [
  {
    title: "Pick Your Battle",
    description: "Cold calls. Discovery meetings. Objection handling. Choose your scenario and difficulty level. Start small or go straight for the boss fight.",
    Scene: PickBattleScene,
    icon: Target,
    align: "left" as const,
  },
  {
    title: "Face the AI",
    description: "Real-time voice conversation. They interrupt. They push back. They test your composure. It feels real because the pressure is real.",
    Scene: FaceAiScene,
    icon: Mic,
    align: "right" as const,
  },
  {
    title: "Level Up",
    description: "Instant feedback on what worked, what flopped, and how to crush it next time. Track your progress and unlock new difficulty tiers.",
    Scene: LevelUpScene,
    icon: TrendingUp,
    align: "left" as const,
  },
];

function StepRow({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const isLeft = step.align === "left";

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
          "text-center md:text-left relative",
          !isLeft && "md:order-2"
        )}
      >
        <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary mb-4">
          {step.title}
        </h3>
        <p className="text-text-secondary text-lg leading-relaxed max-w-lg mx-auto md:mx-0">
          {step.description}
        </p>
      </div>

      {/* 3D Scene */}
      <div
        className={cn(
          "h-[300px] md:h-[400px] rounded-3xl overflow-hidden bg-gradient-to-br from-white/5 to-transparent border border-white/10 backdrop-blur-sm shadow-2xl relative",
          !isLeft && "md:order-1"
        )}
      >
        {/* Ambient Light for the container */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          }
        >
          <step.Scene />
        </Suspense>
      </div>
    </motion.div>
  );
}

export function HowItWorks({ onOpenWaitlist }: HowItWorksProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="relative py-24 md:py-32 overflow-hidden bg-background-primary">
      {/* Background decorations - Matching the style of Features */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-24"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium mb-6 bg-primary/10 border-primary/20 text-primary"
          >
            <Zap className="w-4 h-4" />
            Simple 3-Step Process
          </motion.div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Train Like You{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">
                Sell
              </span>
              <motion.div
                className="absolute bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </span>
          </h2>
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto">
            No lectures. No scripts. Just real practice with AI that fights back.
          </p>
        </motion.div>

        {/* Steps Rows */}
        <div className="relative">
          {/* Vertical Connecting Line (Optional, might be too busy with alternating rows, trying without first for cleaner look or adding a subtle one) */}
          {/* Let's skip the connecting line for now as the alternating layout makes it tricky to look good without SVG curves */}

          {steps.map((step, index) => (
            <StepRow key={step.title} step={step} index={index} />
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-20 md:mt-32"
        >
          <Button size="lg" onClick={onOpenWaitlist} className="group">
            Join the Waitlist
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
