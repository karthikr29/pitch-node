"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const personas = [
  {
    id: "sales",
    title: "Sales Professionals",
    subtitle: "Close more deals",
    description: "Master cold calls, discovery, demos, and objection handling. Walk into every sales conversation ready to win.",
    stats: [
      { label: "Faster Ramp", value: "3x" },
      { label: "More Confident", value: "87%" },
    ],
    size: "large",
  },
  {
    id: "founder",
    title: "Founders & Entrepreneurs",
    subtitle: "Pitch investors with confidence",
    description: "Perfect your investor pitch, nail tough Q&As, and walk into every meeting ready to close the deal.",
    stats: [
      { label: "Pitch Ready", value: "3x" },
    ],
    size: "medium",
  },
  {
    id: "pm",
    title: "Product & Technical Leads",
    subtitle: "Sell your vision",
    description: "Practice stakeholder presentations, executive pitches, and demos. Get buy-in faster.",
    stats: [
      { label: "Clarity Boost", value: "2x" },
    ],
    size: "medium",
  },
];

function PersonaCard({ persona, index }: { persona: typeof personas[0]; index: number }) {
  const isLarge = persona.size === "large";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        "h-full", // Ensure wrapper fills height
        isLarge ? "md:col-span-2" : ""
      )}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.5, // Staggered float start
        }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }} // Slight lift on hover, overriding float cleanly
        className={cn(
          "group relative p-8 md:p-10 cursor-pointer h-full flex flex-col",
          "bg-surface border border-border/60 shadow-lg hover:shadow-xl transition-all duration-500" // Solid background and visible border
        )}
      >
        {/* Heavy Corner Markers - Tech/HUD Style - Visible in Light Mode */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Left */}
          <motion.div
            className="absolute -top-[1px] -left-[1px] w-8 h-8 border-t-4 border-l-4 border-primary z-10"
            whileHover={{ x: -2, y: -2 }}
          />
          {/* Top Right */}
          <motion.div
            className="absolute -top-[1px] -right-[1px] w-8 h-8 border-t-4 border-r-4 border-primary z-10"
            whileHover={{ x: 2, y: -2 }}
          />
          {/* Bottom Left */}
          <motion.div
            className="absolute -bottom-[1px] -left-[1px] w-8 h-8 border-b-4 border-l-4 border-primary z-10"
            whileHover={{ x: -2, y: 2 }}
          />
          {/* Bottom Right */}
          <motion.div
            className="absolute -bottom-[1px] -right-[1px] w-8 h-8 border-b-4 border-r-4 border-primary z-10"
            whileHover={{ x: 2, y: 2 }}
          />
        </div>

        {/* Hover overlay - Subtle internal glow */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex flex-col items-start gap-4 mb-6">
            <div className="inline-flex items-center justify-center px-3 py-1 rounded bg-primary/10 border border-primary/20 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {persona.subtitle}
              </span>
            </div>

            <h3 className="font-display text-3xl font-bold text-text-primary group-hover:translate-x-1 transition-transform duration-300">
              {persona.title}
            </h3>
          </div>

          {/* Description */}
          <div className="mb-8 max-w-xl">
            <p className="text-text-secondary text-lg leading-relaxed">
              {persona.description}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-auto pt-6 border-t border-border/50">
            <div className="flex gap-12">
              {persona.stats.map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="font-display text-3xl font-bold text-primary tabular-nums">
                    {stat.value}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-text-muted font-medium mt-1">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Personas() {
  return (
    <section id="personas" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background-primary" />

      {/* Subtle grid pattern - Restored */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
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
          className="text-center mb-16 md:mb-24"
        >
          <div className="inline-block px-4 py-2 rounded-full border text-sm font-medium mb-6 bg-primary/5 border-primary/20 text-primary">
            Built for Anyone Who Sells or Pitches
          </div>

          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 tracking-tight">
            Who It&apos;s{" "}
            <span className="text-primary">For</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Whether you&apos;re closing deals, pitching investors, or presenting to stakeholders — PitchNode accelerates your growth.
          </p>
        </motion.div>

        {/* Grid Layout */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-8">
          {personas.map((persona, index) => (
            <PersonaCard key={persona.id} persona={persona} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
