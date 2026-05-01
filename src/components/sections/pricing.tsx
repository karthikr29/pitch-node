"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { Button } from "@/components/ui";
import { Check, Lock, Sparkles, Zap, Trophy, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "600 credits to start",
  "Pitch call type",
  "AI performance feedback",
  "Session history",
];

const PRO_FEATURES = [
  "30,000 credits / month",
  "All current call types",
  "Real-time AI feedback on every call",
  "Detailed analytics & scoring",
  "Progress tracking over time",
  "Cancel anytime, no commitment",
];

const CHAMPION_FEATURES = [
  "Everything in Performer",
  "Custom scenario builder",
  "Team workspace & manager dashboard",
  "Advanced cross-session analytics",
  "Custom AI persona training",
  "CRM integrations (Salesforce, HubSpot)",
  "API access for LMS platforms",
  "Priority support",
];

const FAQ_ITEMS = [
  {
    q: "What is a credit?",
    a: "Think of a credit as one second of live practice time. Free accounts get 600 credits each call. With Performer, you get 30,000 credits every month — plenty to run as many scenarios as you want.",
  },
  {
    q: "How many credits do I get on the free plan?",
    a: "Each call starts with 600 credits. There's no monthly cap — start a new call whenever you want and you'll get a fresh 600 every time.",
  },
  {
    q: "What is the difference between Warm Up and Performer?",
    a: "Warm Up is free and covers the Pitch scenario — it's a great way to get a feel for how PitchNode works. Performer is the full package: 30,000 credits a month, every call type we offer, detailed scores, and progress tracking across all your sessions.",
  },
  {
    q: "What call types are included?",
    a: "Free accounts include the Pitch scenario. Performer gives you access to everything we currently offer, and we ship new call types regularly.",
  },
  {
    q: "What happens when I run out of credits during a call?",
    a: "We'll warn you before you hit the limit. When credits run out, the call ends automatically — your session and feedback are saved so nothing gets lost. You can start a fresh call right after.",
  },
  {
    q: "Do my Performer credits roll over each month?",
    a: "No, they don't. Any credits you haven't used are cleared at the end of the month. You get a fresh 30,000 at the start of each billing period.",
  },
  {
    q: "Can I get more credits if I run out before the month ends?",
    a: "Yes — just get in touch and we'll top up your account. A self-serve option for buying extra credits is on the way.",
  },
  {
    q: "Is the $79/mo price guaranteed?",
    a: "Yes. Sign up now and $79/mo is yours for life. When we raise the price for new customers, yours stays exactly where it is.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, anytime. No contracts, no fees. Just head to your account settings and cancel — that's it.",
  },
];

function WarmUpCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.15 }}
      className="relative rounded-2xl p-8 flex flex-col bg-surface/80 border border-border/50 shadow-lg"
    >
      <div className="mb-2">
        <span className="text-xs font-semibold tracking-widest text-text-muted uppercase">Free</span>
      </div>
      <div className="mb-1">
        <span className="font-display text-5xl font-extrabold text-text-primary">$0</span>
      </div>
      <p className="text-text-muted text-sm mb-1">Free forever</p>
      <p className="text-text-secondary text-sm mb-6">600 credits, no credit card needed</p>

      <ul className="space-y-3 mb-8 flex-1">
        {FREE_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span className="text-text-secondary text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button size="lg" variant="outline" asChild className="w-full">
        <Link href="/login">Try for Free</Link>
      </Button>
    </motion.div>
  );
}

function PerformerCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.15 }}
      className="relative rounded-2xl p-8 flex flex-col bg-gradient-to-b from-primary/10 via-surface to-surface border-2 border-primary/50 shadow-xl shadow-primary/10"
    >
      {/* Launch Price corner badge */}
      <div className="absolute -top-3 -right-3 z-10">
        <div className="relative">
          <div className="bg-primary text-text-on-primary text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg shadow-primary/40 leading-tight text-center">
            <div className="tracking-wider">LAUNCH PRICE</div>
            <div className="text-sm font-black">68% OFF</div>
          </div>
        </div>
      </div>

      {/* Pro badge */}
      <div className="mb-2 flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs font-bold text-primary tracking-wider uppercase">Performer</span>
        </div>
      </div>

      {/* Price */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-text-muted line-through text-xl font-semibold">$249</span>
        <span className="font-display text-5xl font-extrabold text-text-primary">$79</span>
      </div>
      <p className="text-text-muted text-sm mb-6">per month, billed monthly</p>

      <ul className="space-y-3 mb-8 flex-1">
        {PRO_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span className="text-text-secondary text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button size="lg" variant="default" asChild className="w-full">
        <Link href="/login">Get Started</Link>
      </Button>
    </motion.div>
  );
}

function ChampionCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.15 }}
      className="relative rounded-2xl p-8 flex flex-col bg-surface/50 border border-border/30 shadow-lg overflow-hidden"
    >
      {/* Coming Soon overlay */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 rounded-2xl flex flex-col items-center justify-center gap-3">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-border shadow-lg">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-text-primary tracking-wide">COMING SOON</span>
        </div>
        <p className="text-text-muted text-xs text-center max-w-[180px]">
          Advanced team features launching later this year
        </p>
      </div>

      {/* Card content (blurred behind overlay) */}
      <div className="mb-2">
        <span className="text-xs font-semibold tracking-widest text-text-muted uppercase">Champion</span>
      </div>
      <div className="mb-1">
        <span className="font-display text-5xl font-extrabold text-text-primary opacity-40">$—</span>
      </div>
      <p className="text-text-muted text-sm mb-6 opacity-40">Team pricing</p>

      <ul className="space-y-3 mb-8 flex-1 opacity-40">
        {CHAMPION_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
            <span className="text-text-secondary text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button size="lg" variant="outline" disabled className="w-full opacity-40">
        Coming Soon
      </Button>
    </motion.div>
  );
}

function FaqSection({ isInView }: { isInView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="max-w-2xl mx-auto mt-20"
    >
      <h3 className="font-display text-2xl font-bold text-text-primary text-center mb-8">
        Frequently asked questions
      </h3>
      <Accordion.Root type="single" collapsible className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <Accordion.Item
            key={i}
            value={`item-${i}`}
            className="rounded-xl border border-border/50 bg-surface/60 overflow-hidden"
          >
            <Accordion.Trigger className="group flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-text-primary hover:bg-surface/80 transition-colors [&[data-state=open]>svg]:rotate-180">
              {item.q}
              <ChevronDown className="w-4 h-4 text-text-muted shrink-0 transition-transform duration-200" />
            </Accordion.Trigger>
            <Accordion.Content className="accordion-content overflow-hidden text-sm text-text-secondary">
              <div className="px-5 pb-4 pt-0">{item.a}</div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
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
        <div className={cn("grid gap-8 max-w-5xl mx-auto", "md:grid-cols-3")}>
          <WarmUpCard index={0} />
          <PerformerCard index={1} />
          <ChampionCard index={2} />
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-text-muted text-sm mt-10"
        >
          Launch pricing is limited and subject to change. Lock in your rate today.
        </motion.p>

        {/* FAQ */}
        <FaqSection isInView={isInView} />
      </div>
    </section>
  );
}
