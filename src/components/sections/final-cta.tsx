"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui";
import { ArrowRight, Sparkles, Users, Rocket, Clock } from "lucide-react";
import { useWaitlistCount } from "@/hooks/use-waitlist-count";

interface FinalCTAProps {
  onOpenWaitlist: () => void;
}

// Floating orb component for background
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
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Animated ring gauge for the counter
function CircularGauge({ value, maxValue = 100 }: { value: number; maxValue?: number }) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const springValue = useSpring(0, {
    stiffness: 30,
    damping: 15,
  });

  const displayNumber = useTransform(springValue, (latest) =>
    Math.round(latest)
  );

  const progress = useTransform(springValue, (latest) =>
    Math.min((latest / maxValue) * 100, 100)
  );

  const strokeDashoffset = useTransform(progress, (p) => {
    const circumference = 2 * Math.PI * 120;
    return circumference - (p / 100) * circumference;
  });

  useEffect(() => {
    if (isInView && !hasAnimated && value > 0) {
      const timer = setTimeout(() => {
        springValue.set(value);
        setHasAnimated(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, hasAnimated, springValue, isInView]);

  const circumference = 2 * Math.PI * 120;

  return (
    <div ref={ref} className="relative">
      {/* Outer glow ring */}
      <div className="absolute inset-0 blur-xl opacity-30">
        <svg viewBox="0 0 280 280" className="w-full h-full">
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="url(#glowGradient)"
            strokeWidth="12"
          />
        </svg>
      </div>

      <svg viewBox="0 0 280 280" className="w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 drop-shadow-2xl">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="50%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.5" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx="140"
          cy="140"
          r="120"
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
          opacity="0.3"
        />

        {/* Tick marks */}
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i * 18 - 90) * (Math.PI / 180);
          const x1 = (140 + 108 * Math.cos(angle)).toFixed(4);
          const y1 = (140 + 108 * Math.sin(angle)).toFixed(4);
          const x2 = (140 + 115 * Math.cos(angle)).toFixed(4);
          const y2 = (140 + 115 * Math.sin(angle)).toFixed(4);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--text-muted)"
              strokeWidth="2"
              opacity="0.3"
            />
          );
        })}

        {/* Progress arc */}
        <motion.circle
          cx="140"
          cy="140"
          r="120"
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
          transform="rotate(-90 140 140)"
          filter="url(#glow)"
        />

        {/* Center content */}
        <foreignObject x="40" y="70" width="200" height="140">
          <div className="flex flex-col items-center justify-center h-full">
            <motion.span
              className="font-display text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent"
            >
              {displayNumber}
            </motion.span>
            <span className="text-text-secondary text-sm md:text-base mt-1">of {maxValue} spots</span>
          </div>
        </foreignObject>
      </svg>

      {/* Animated pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/30"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Feature pill component
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

// Live indicator
function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
      </span>
      <span className="text-xs font-medium text-success uppercase tracking-wider">Live Waitlist</span>
    </div>
  );
}

export function FinalCTA({ onOpenWaitlist }: FinalCTAProps) {
  const { count } = useWaitlistCount({
    initialCount: 18,
    pollingInterval: 5000,
  });

  return (
    <section className="relative py-24 md:py-32 lg:py-40 overflow-hidden bg-background-secondary border-t border-border/40">
      {/* Background with gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-secondary via-background-primary/50 to-background-secondary" />

      {/* Animated floating orbs */}
      <FloatingOrb delay={0} size="w-96 h-96" position={{ top: "10%", left: "-10%" }} color="var(--primary)" />
      <FloatingOrb delay={2} size="w-80 h-80" position={{ bottom: "20%", right: "-5%" }} color="var(--accent)" />
      <FloatingOrb delay={4} size="w-64 h-64" position={{ top: "50%", left: "30%" }} color="var(--primary)" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-left"
          >


            {/* Main headline */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight"
            >
              Join the Future of
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  Sales & Pitch Mastery
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
                    stroke="url(#underlineGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="underlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
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
              className="text-text-secondary text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-8"
            >
              Be among the first 100 professionals to experience AI-powered practice that actually works.
              <span className="text-primary font-semibold"> Limited early access spots remaining.</span>
            </motion.p>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap justify-center lg:justify-start gap-3 mb-10"
            >
              <FeaturePill icon={Clock} text="No credit card required" delay={0.4} />
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col items-center lg:items-start gap-4"
            >
              <Button
                size="lg"
                onClick={onOpenWaitlist}
                className="group text-lg px-10 py-6 border-2 border-primary shadow-[0_0_10px_var(--color-primary)] hover:shadow-[0_0_20px_var(--color-primary)] transition-all"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Claim Your Spot
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <div className="flex items-center gap-2 text-text-muted text-sm pl-1">
                <Users className="w-4 h-4" />
                <span>{count}+ joined this week</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual Counter */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative flex items-center justify-center"
          >
            {/* Glassmorphism card */}
            <div className="relative">
              {/* Decorative elements */}
              <motion.div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-white/10"
                animate={{ rotate: [0, 10, 0], y: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -bottom-6 -left-6 w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 backdrop-blur-sm border border-white/10"
                animate={{ rotate: [0, -10, 0], y: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />

              {/* Main card */}
              <div className="relative bg-gradient-to-br from-surface/90 via-background-secondary/90 to-surface/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-border/50 shadow-2xl">
                {/* Live Waitlist Badge */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-success/20 shadow-lg shadow-success/10">
                    <LiveIndicator />
                  </div>
                </div>
                {/* Inner glow */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

                <div className="relative z-10 flex flex-col items-center">
                  {/* Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
                  >
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Early Adopters Only</span>
                  </motion.div>

                  {/* Circular Gauge */}
                  <CircularGauge value={count} maxValue={100} />

                  {/* Status text */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="mt-8 text-center"
                  >
                    <p className="text-text-secondary font-medium mb-2">
                      Early access unlocks at 100 signups
                    </p>
                    <div className="flex items-center justify-center gap-2 text-accent">
                      <Rocket className="w-4 h-4" />
                      <span className="text-sm font-semibold">Beta launching soon</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom trust indicators */}
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
