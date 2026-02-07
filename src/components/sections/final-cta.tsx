"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { ArrowRight, Sparkles, Mic2, Target, TrendingUp } from "lucide-react";

function FloatingOrb({ delay, size, position, color }: {
  delay: number;
  size: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  color: string;
}) {
  return (
    <motion.div
      className={`absolute ${size} rounded-full blur-3xl opacity-40`}
      style={{ ...position, background: color }}
      animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 8, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function FeaturePill({ icon: Icon, text, delay }: {
  icon: React.ElementType;
  text: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, y: -2 }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface/80 backdrop-blur-sm border border-border/50 shadow-lg"
    >
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-sm font-medium text-text-primary">{text}</span>
    </motion.div>
  );
}

export function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32 lg:py-40 overflow-hidden bg-background-secondary border-t border-border/40">
      <div className="absolute inset-0 bg-gradient-to-b from-background-secondary via-background-primary/50 to-background-secondary" />

      <FloatingOrb delay={0} size="w-96 h-96" position={{ top: "10%", left: "-10%" }} color="var(--primary)" />
      <FloatingOrb delay={2} size="w-80 h-80" position={{ bottom: "20%", right: "-5%" }} color="var(--accent)" />
      <FloatingOrb delay={4} size="w-64 h-64" position={{ top: "50%", left: "30%" }} color="var(--primary)" />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight"
        >
          Ready to Master Your
          <br />
          <span className="relative">
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Next Conversation?
            </span>
            <motion.svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 12"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.path
                d="M2 8C50 2 200 2 298 8"
                stroke="url(#finalCtaUnderline)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="finalCtaUnderline" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
            </motion.svg>
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-8"
        >
          Stop rehearsing in your head. Start practicing against AI that pushes back, challenges you, and makes you better.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          <FeaturePill icon={Mic2} text="Real-time voice practice" delay={0.4} />
          <FeaturePill icon={Target} text="5+ AI personas" delay={0.5} />
          <FeaturePill icon={TrendingUp} text="Instant feedback" delay={0.6} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <Button
            size="lg"
            asChild
            className="group text-lg px-10 py-6 border-2 border-primary shadow-[0_0_10px_var(--color-primary)] hover:shadow-[0_0_20px_var(--color-primary)] transition-all"
          >
            <Link href="/login">
              <Sparkles className="w-5 h-5 mr-2" />
              Start Free
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <p className="text-text-muted text-sm">No credit card required</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-20 pt-12 border-t border-border/30"
        >
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {[
              { label: "Response Time", value: "< 24hrs" },
              { label: "AI Personas", value: "5+" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-text-primary font-medium mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
