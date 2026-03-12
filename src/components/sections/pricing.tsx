"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui";
import { Check, Sparkles, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Get started with the basics",
    features: [
      "3 practice sessions per week",
      "1 AI persona",
      "Basic performance feedback",
      "Session history (last 5)",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "Everything you need to master sales",
    features: [
      "Unlimited practice sessions",
      "All 5+ AI personas",
      "Detailed analytics & scoring",
      "Progress tracking over time",
      "Custom scenario builder",
      "Priority AI response time",
    ],
    cta: "Start Free Trial",
    href: "/login",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams that need to win together",
    features: [
      "Everything in Pro",
      "Team management dashboard",
      "Admin analytics & reporting",
      "SSO / SAML authentication",
      "Custom AI persona training",
      "Priority support & onboarding",
    ],
    cta: "Contact Sales",
    href: "mailto:hello@convosparr.io",
    highlighted: false,
  },
];

function PricingCard({
  tier,
  index,
}: {
  tier: (typeof tiers)[0];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.15 }}
      className={cn(
        "relative rounded-2xl p-8 flex flex-col",
        tier.highlighted
          ? "bg-gradient-to-b from-primary/10 via-surface to-surface border-2 border-primary/50 shadow-xl shadow-primary/10"
          : "bg-surface/80 border border-border/50 shadow-lg"
      )}
    >
      {tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-text-on-primary text-xs font-bold shadow-lg shadow-primary/30">
            <Sparkles className="w-3 h-3" />
            {tier.badge}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {tier.name === "Enterprise" && <Building2 className="w-5 h-5 text-primary" />}
          <h3 className="font-display text-xl font-bold text-text-primary">{tier.name}</h3>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="font-display text-4xl font-extrabold text-text-primary">
            {tier.price}
          </span>
          {tier.period && (
            <span className="text-text-muted text-sm">{tier.period}</span>
          )}
        </div>
        <p className="text-text-secondary text-sm">{tier.description}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span className="text-text-secondary text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        size="lg"
        variant={tier.highlighted ? "default" : "outline"}
        asChild
        className="w-full"
      >
        <Link href={tier.href}>{tier.cta}</Link>
      </Button>
    </motion.div>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="pricing"
      ref={ref}
      className="relative py-24 md:py-32 overflow-hidden bg-background-secondary"
    >
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium mb-6 bg-primary/10 border-primary/20 text-primary"
          >
            <Sparkles className="w-4 h-4" />
            Simple Pricing
          </motion.div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4">
            Choose Your{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">Plan</span>
              <motion.div
                className="absolute bottom-1 left-0 w-full h-2 -z-10 rounded bg-primary/20"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </span>
          </h2>
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready to go all in.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, index) => (
            <PricingCard key={tier.name} tier={tier} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
