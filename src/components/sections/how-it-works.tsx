"use client";

import { motion } from "framer-motion";
import { Target, Mic, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface HowItWorksProps {
  onOpenWaitlist: () => void;
}

const steps = [
  {
    number: "01",
    icon: Target,
    title: "Pick Your Battle",
    description: "Cold calls. Discovery meetings. Objection handling. Choose your scenario and difficulty.",
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    iconBg: "from-sky-500 to-blue-600",
  },
  {
    number: "02",
    icon: Mic,
    title: "Face the AI",
    description: "Real-time voice conversation. They interrupt. They push back. They test your composure.",
    gradient: "from-cyan-500/20 via-teal-500/10 to-transparent",
    iconBg: "from-cyan-500 to-teal-600",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Level Up",
    description: "Instant feedback on what worked, what flopped, and how to crush it next time.",
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    iconBg: "from-violet-500 to-purple-600",
  },
];

function AnimatedWaveform() {
  return (
    <div className="flex items-center gap-0.5 h-8">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ background: "linear-gradient(to top, #0D9488, #2DD4BF)" }}
          animate={{
            height: [8, 24, 8],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function AnimatedChart() {
  return (
    <div className="flex items-end gap-1 h-16">
      {[40, 65, 45, 80, 60, 95, 70].map((height, i) => (
        <motion.div
          key={i}
          className="w-3 rounded-t"
          style={{ background: "linear-gradient(to top, #7C3AED, #A78BFA)" }}
          initial={{ height: 0 }}
          whileInView={{ height: `${height}%` }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
            delay: i * 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function AnimatedTarget() {
  return (
    <div className="relative w-20 h-20">
      {[0, 1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          style={{
            scale: 1 - ring * 0.25,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1 - ring * 0.25, 1 - ring * 0.2, 1 - ring * 0.25],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: ring * 0.2,
          }}
        />
      ))}
      <motion.div
        className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
        animate={{
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
    </div>
  );
}

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const animations = [AnimatedTarget, AnimatedWaveform, AnimatedChart];
  const AnimationComponent = animations[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: 0.15 * index, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative cursor-pointer"
    >
      {/* Card */}
      <div className="relative h-full overflow-hidden rounded-2xl bg-surface border border-border/50 hover:border-border transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {/* Content */}
        <div className="relative p-6 md:p-8 h-full flex flex-col">
          {/* Top row - icon */}
          <div className="flex items-start justify-end mb-6">
            <div className={`w-12 h-12 bg-gradient-to-br ${step.iconBg} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
              <step.icon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Animation area */}
          <div className="flex-1 flex items-center justify-center py-4 mb-6 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
            <AnimationComponent />
          </div>

          {/* Title and description */}
          <div>
            <h3 className="font-display text-xl md:text-2xl font-bold text-text-primary mb-3 transition-colors duration-300">
              {step.title}
            </h3>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Hover indicator */}
          <div className="mt-6 flex items-center gap-2 text-text-muted transition-colors duration-300">
            <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
              Learn more
            </span>
            <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 delay-75" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HowItWorks({ onOpenWaitlist }: HowItWorksProps) {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-primary" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium mb-6 bg-primary/10 border-primary/20 text-primary"
          >
            <Zap className="w-4 h-4" />
            Simple 3-Step Process
          </motion.div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Train Like You{" "}
            <span className="relative">
              <span className="relative z-10 text-primary">
                Sell
              </span>
              <motion.span
                className="absolute bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </span>
          </h2>
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto">
            No lectures. No scripts. Just real practice with AI that fights back.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>

        {/* Bottom connector line - hidden on mobile */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="hidden md:block relative h-px mt-12 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-12"
        >
          <Button size="lg" onClick={onOpenWaitlist} className="group">
            Join the Waitlist
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
