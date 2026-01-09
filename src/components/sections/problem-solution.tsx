"use client";

import { motion } from "framer-motion";
import { X, Check, TrendingDown, Zap, Clock, Users, Target, Sparkles } from "lucide-react";

const problems = [
  { icon: Clock, text: "Reps burn through real prospects while learning" },
  { icon: TrendingDown, text: "Skills decay between high-stakes conversations" },
  { icon: Users, text: "Role-play with colleagues lacks realism" },
];

const solutions = [
  { icon: Target, text: "Unlimited practice with AI that fights back" },
  { icon: Zap, text: "Build reflexes, not just knowledge" },
  { icon: Sparkles, text: "Get scored feedback after every session" },
];

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="font-display text-5xl md:text-6xl font-bold"
    >
      {value}{suffix}
    </motion.span>
  );
}

export function ProblemSolution() {
  return (
    <section id="problem-solution" className="relative py-24 md:py-32 overflow-hidden bg-background-secondary">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-secondary/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            The Gap Between{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">Training</span>
              <motion.span
                className="absolute bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </span>
            {" "}and{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">Reality</span>
              <motion.span
                className="absolute bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
              />
            </span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Traditional sales training teaches you what to say. PitchNode teaches you how to think on your feet.
          </p>
        </motion.div>

        {/* Main comparison grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Without PitchNode */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative cursor-pointer"
          >
            {/* Card */}
            <div className="relative h-full p-8 md:p-10 rounded-3xl bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/20 dark:border-red-500/10 transition-shadow duration-300 hover:shadow-2xl hover:shadow-red-500/10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-semibold text-red-500 uppercase tracking-wider">
                  Without PitchNode
                </span>
              </div>

              {/* Problems list */}
              <div className="space-y-5">
                {problems.map((problem, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-background-secondary dark:bg-surface flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/10 transition-colors">
                      <problem.icon className="w-5 h-5 text-text-muted group-hover:text-red-500 transition-colors" />
                    </div>
                    <p className="text-text-secondary pt-2 text-base leading-relaxed">
                      {problem.text}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Stat */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-10 pt-8 border-t border-red-500/10"
              >
                <div className="flex items-baseline gap-2">
                  <AnimatedCounter value={67} suffix="%" />
                  <span className="text-text-muted text-sm">
                    of deals lost to poor objection handling
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* With PitchNode */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative group cursor-pointer"
          >
            {/* Glow effect */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            
            {/* Card */}
            <div className="relative h-full p-8 md:p-10 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 dark:border-primary/10 transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                  With PitchNode
                </span>
              </div>

              {/* Solutions list */}
              <div className="space-y-5">
                {solutions.map((solution, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-background-secondary dark:bg-surface flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                      <solution.icon className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-text-secondary pt-2 text-base leading-relaxed">
                      {solution.text}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Stat */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-10 pt-8 border-t border-primary/10"
              >
                <div className="flex items-baseline gap-2">
                  <AnimatedCounter value={3} suffix="x" />
                  <span className="text-text-muted text-sm">
                    faster skill development vs traditional training
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
