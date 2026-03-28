"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Lock } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, StarryBackground, AnimatedCounter } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useWaitlist } from "@/contexts/waitlist-context";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const STARTER_FEATURES = [
  { text: "Core AI roleplay features included", locked: false },
  { text: "600 one-time practice credits", locked: false },
  { text: "Detailed performance analytics", locked: true },
];

const PRO_FEATURES = [
  { text: "30,000 credits per month", locked: false },
  { text: "Real-time AI feedback on every call", locked: false },
  { text: "Detailed performance analytics", locked: false },
  { text: "Cancel anytime, no commitment", locked: false },
];

const FAQ_ITEMS = [
  {
    question: "What happens after I join the waitlist?",
    answer:
      "You will be among the first to get access when we launch. We will email you with your invitation and full setup instructions.",
  },
  {
    question: "Is the $79/mo price guaranteed?",
    answer:
      "Yes. Everyone who joins during the launch period locks in this rate for the lifetime of their subscription. When the price goes up, yours stays at $79/mo.",
  },
  {
    question: "What is a credit and how does it work?",
    answer:
      "One credit equals one second of active AI roleplay practice. The Pro Plan gives you 30,000 credits per month, which is roughly 10 to 15 full sales scenarios.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No contracts, no cancellation fees. You can cancel at any time from your account dashboard.",
  },
];

function FeatureItem({
  text,
  locked,
  delay,
  dim,
}: {
  text: string;
  locked: boolean;
  delay: number;
  dim?: boolean;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={cn("flex items-center gap-3", dim && "opacity-50")}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
          locked ? "bg-border/40" : "bg-success/20"
        )}
      >
        {locked ? (
          <Lock className="w-2.5 h-2.5 text-text-muted" strokeWidth={2.5} />
        ) : (
          <Check className="w-3 h-3 text-success" strokeWidth={3} />
        )}
      </div>
      <span
        className={cn(
          "text-sm leading-snug flex-1",
          locked
            ? "text-text-muted line-through decoration-text-muted/40"
            : "text-text-secondary",
          dim && "italic"
        )}
      >
        {text}
      </span>
      {locked && (
        <Badge variant="default" className="text-[10px] px-2 py-0 h-5 shrink-0">
          Pro
        </Badge>
      )}
    </motion.li>
  );
}

export default function PricingClient() {
  const { openModal } = useWaitlist();

  return (
    <>
      <StarryBackground />
      <Header onOpenWaitlist={openModal} />

      <main className="min-h-screen bg-background-primary">
        <div className="pt-24">

          {/* ── Launch Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="border-b border-orange-500/20 bg-orange-500/10 backdrop-blur-md py-4"
          >
            <div className="flex items-center justify-center gap-3 px-4 text-center max-w-4xl mx-auto">
              <span className="text-xl md:text-2xl animate-pulse">🚀</span>
              <p className="text-lg md:text-xl font-bold text-orange-200/90 text-left md:text-center tracking-wide">
                <span className="text-orange-400">Launch Pricing: </span>
                Lock in $79/mo before the early access period ends.
              </p>
            </div>
          </motion.div>

          {/* ── Hero Heading ── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="text-center pt-20 pb-14 px-4"
          >
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold text-text-primary mb-5 tracking-tight leading-[1.05]">
              Pricing
            </h1>
            <p className="text-lg md:text-xl text-text-secondary max-w-sm mx-auto">
              No tiers. No hidden fees. No surprises.
            </p>
          </motion.section>

          {/* ── Cards Grid ── */}
          <div className="max-w-4xl mx-auto px-4 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-4">

              {/* ─ STARTER card ─ */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
                className="flex flex-col h-full relative mt-8"
              >
                <div
                  className="rounded-3xl flex flex-col flex-1 px-8 py-10 transition-colors duration-300"
                  style={{
                    border: "1px solid rgba(255,255,255,0.06)",
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-8">
                    <span className="text-[12px] font-bold tracking-widest uppercase text-text-muted">
                      Free
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-8">
                    <div className="flex items-baseline gap-2 h-auto md:h-[60px]">
                      <span className="font-display text-5xl font-medium tracking-tight text-white mt-auto">
                        $0
                      </span>
                    </div>
                    <span className="text-text-secondary text-[15px]">Free forever</span>
                  </div>

                  {/* Credits block */}
                  <div
                    className="rounded-2xl px-5 py-4 mb-8"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <AnimatedCounter
                        value={600}
                        duration={0.9}
                        className="font-display text-[28px] font-medium text-white leading-none"
                      />
                      <span className="text-sm text-text-muted">credits</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-10 flex-1">
                    {STARTER_FEATURES.map((f, i) => (
                      <FeatureItem key={i} {...f} delay={0.3 + i * 0.07} />
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full text-[15px] font-medium tracking-wide border-white/10 hover:bg-white/5 h-12 rounded-xl"
                      onClick={openModal}
                    >
                      Try for Free
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* ─ PRO card ─ */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
                className="flex flex-col h-full relative mt-8 pt-2"
              >
                {/* Left-Aligned Launch Price Pill */}
                <div className="absolute -top-2 left-4 z-20 pointer-events-none">
                  <div
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black text-white shadow-[0_4px_30px_rgba(255,153,0,0.6)] uppercase tracking-widest"
                    style={{ background: "linear-gradient(135deg, #FFAC31 0%, #EC7211 100%)", border: "1px solid rgba(255,255,255,0.4)" }}
                  >
                    <span>LAUNCH PRICE</span>
                  </div>
                </div>

                {/* Stamp Sticker */}
                <div className="absolute -top-6 -right-5 z-20 rotate-12 drop-shadow-2xl hover:rotate-6 transition-transform duration-300 pointer-events-none">
                  <div
                    className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-white font-black px-4 py-2.5 rounded-lg shadow-2xl"
                    style={{
                      border: '1px solid rgba(255,255,255,0.4)',
                      boxShadow: '0 10px 25px rgba(236,114,17,0.5), inset 0 2px 0 rgba(255,255,255,0.6)'
                    }}
                  >
                    <div className="text-[11px] uppercase tracking-widest text-white/90 leading-none mb-0.5">Limited Rate</div>
                    <div className="text-lg tracking-wider leading-none">68% OFF</div>
                  </div>
                </div>

                <div
                  className="rounded-3xl flex flex-col flex-1 relative z-0 px-8 py-10 transition-colors duration-300"
                  style={{
                    border: "1px solid rgba(255,153,0,0.3)",
                    backgroundColor: "rgba(255,153,0,0.03)",
                    boxShadow: "0 0 40px -10px rgba(255,153,0,0.1)",
                  }}
                >
                  {/* Subtle top ambient glow inside the card */}
                  <div
                    className="absolute inset-x-0 top-0 h-40 pointer-events-none rounded-t-3xl"
                    style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,153,0,0.1) 0%, transparent 70%)' }}
                  />

                  {/* Header / Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-8 relative z-10">
                    <span className="text-[12px] font-bold tracking-widest uppercase" style={{ color: "#FF9900" }}>
                      Pro
                    </span>
                  </div>

                  {/* Price Block */}
                  <div className="flex flex-col gap-2 mb-8 relative z-10">
                    <div className="flex items-baseline gap-3 h-auto md:h-[60px]">
                      <div className="relative inline-block transform -translate-y-1 mt-auto">
                        <span className="text-3xl font-medium text-text-muted/60">
                          $249
                        </span>
                        {/* The X cross */}
                        <div className="absolute top-[50%] left-[-5%] w-[110%] h-[2px] bg-red-400/80 -rotate-[24deg] drop-shadow-sm pointer-events-none" />
                        <div className="absolute top-[50%] left-[-5%] w-[110%] h-[2px] bg-red-400/80 rotate-[24deg] drop-shadow-sm pointer-events-none" />
                      </div>
                      <span
                        className="font-display text-5xl font-medium tracking-tight mt-auto text-white"
                      >
                        $79
                      </span>
                    </div>
                    <span className="text-text-secondary text-[15px]">per month, billed monthly</span>
                  </div>

                  {/* Credits block */}
                  <div
                    className="rounded-2xl px-5 py-4 mb-8 relative z-10"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,153,0,0.1)",
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <AnimatedCounter
                        value={30000}
                        duration={1.8}
                        className="font-display text-[28px] font-medium text-[#FF9900]"
                      />
                      <span className="text-sm text-text-muted">credits</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-10 flex-1 relative z-10">
                    {PRO_FEATURES.map((f, i) => (
                      <FeatureItem key={i} {...f} delay={0.32 + i * 0.07} />
                    ))}
                  </ul>

                  <div className="mt-auto relative z-10">
                    <Button
                      size="lg"
                      className="w-full text-[15px] font-medium h-12 rounded-xl border-0"
                      style={{ background: "linear-gradient(180deg, #FF9900 0%, #E68A00 100%)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(255,153,0,0.2)" }}
                      onClick={openModal}
                    >
                      Join the Waitlist
                    </Button>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* ── FAQ ── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
            className="max-w-xl mx-auto px-4 pb-28"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-10 text-center">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.section>

        </div>
      </main>

      <Footer />
    </>
  );
}
