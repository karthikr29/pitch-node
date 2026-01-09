"use client";

import { motion } from "framer-motion";
import {
  Headphones,
  LineChart,
  Crown,
  Sparkles,
  TrendingUp,
  Clock,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";

const personas = [
  {
    id: "sdr",
    title: "New SDRs",
    subtitle: "Fast-track your ramp",
    description: "Compress your first 100 calls into a weekend. Walk into Monday with the confidence of a seasoned pro.",
    icon: Headphones,
    stats: [
      { label: "Faster Ramp", value: "3x", icon: Clock },
      { label: "More Confident", value: "87%", icon: Sparkles },
    ],
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    iconGradient: "from-sky-500 to-blue-600",
    size: "large",
  },
  {
    id: "ae",
    title: "Account Executives",
    subtitle: "Sharpen every skill",
    description: "Perfect your discovery questions and closing techniques. Never walk into a big meeting unprepared.",
    icon: LineChart,
    stats: [
      { label: "Win Rate", value: "+24%", icon: TrendingUp },
    ],
    gradient: "from-cyan-500/20 via-teal-500/10 to-transparent",
    iconGradient: "from-cyan-500 to-teal-600",
    size: "medium",
  },
  {
    id: "manager",
    title: "Sales Managers",
    subtitle: "Scale your best reps",
    description: "Identify who's ready for larger accounts without listening to hundreds of recordings.",
    icon: Crown,
    stats: [
      { label: "Time Saved", value: "10h", icon: Trophy },
    ],
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    iconGradient: "from-violet-500 to-purple-600",
    size: "medium",
  },
];

function PersonaCard({ persona, index }: { persona: typeof personas[0]; index: number }) {
  const isLarge = persona.size === "large";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(
        "group relative overflow-hidden cursor-pointer",
        "rounded-3xl border border-border/50",
        "bg-surface/50 backdrop-blur-sm",
        "transition-all duration-500",
        "hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10",
        isLarge ? "md:col-span-2 md:row-span-1" : ""
      )}
    >
      {/* Gradient background */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          `bg-gradient-to-br ${persona.gradient}`
        )} 
      />
      
      {/* Content */}
      <div className={cn(
        "relative p-8 h-full flex flex-col",
        isLarge ? "md:p-10" : ""
      )}>
        {/* Header */}
        <div className="flex items-start mb-6">
          {/* Icon */}
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br shadow-lg",
              persona.iconGradient,
              "group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
            )}
          >
            <persona.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider mb-2 text-primary">
            {persona.subtitle}
          </p>
          <h3 className="font-display text-2xl font-bold text-text-primary mb-3">
            {persona.title}
          </h3>
          <p className="text-text-secondary leading-relaxed">
            {persona.description}
          </p>
        </div>

        {/* Stats */}
        <div className={cn(
          "flex gap-4 mt-6 pt-6 border-t border-border/50",
          isLarge ? "md:gap-8" : ""
        )}>
          {persona.stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-background-secondary flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-display text-xl font-bold text-text-primary">
                  {stat.value}
                </div>
                <div className="text-xs text-text-muted">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative corner element */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </motion.div>
  );
}

export function Personas() {
  return (
    <section id="personas" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-primary" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--primary)_0%,transparent_50%)] opacity-[0.03]" />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium mb-6 bg-primary/10 border-primary/20 text-primary"
          >
            <Sparkles className="w-4 h-4" />
            Built for Every Sales Role
          </motion.div>
          
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Who It&apos;s{" "}
            <span className="relative inline-block">
              <span className="text-primary">For</span>
              <motion.div
                className="absolute bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Whether you&apos;re starting out or scaling up, PitchNode accelerates your growth with AI-powered practice
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {personas.map((persona, index) => (
            <PersonaCard key={persona.id} persona={persona} index={index} />
          ))}
        </div>
        
        {/* Bottom decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="hidden md:block h-px mt-16 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
      </div>
    </section>
  );
}
