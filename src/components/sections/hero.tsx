"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button, WaveformBackground } from "@/components/ui";
import { Suspense, lazy } from "react";
import { ArrowRight, Mic2, Activity } from "lucide-react";
import dynamic from "next/dynamic";

const TypeAnimation = dynamic(
  () => import("react-type-animation").then((m) => m.TypeAnimation),
  { ssr: false }
);

const HeroScene = lazy(() => import("@/components/3d/hero-scene"));

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden bg-background-primary">
      <WaveformBackground variant="primary" className="opacity-40" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 text-left">
            {/* Now Live Badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-6"
            >
              <div className="relative">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/30"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <span className="text-sm font-semibold tracking-wide uppercase text-primary">
                Practice Before It Happens &bull; Now Live
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-text-primary leading-[1.05] mb-6"
            >
              <motion.span
                className="block mb-2"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                Master Every
              </motion.span>

              <motion.div
                className="relative inline-block mb-2 min-h-[1.2em]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <TypeAnimation
                  sequence={[
                    1200,
                    "Pitch", 2000,
                    "Cold Call", 2000,
                    "Discovery", 2000,
                    "Demo", 2000,
                    "Objection", 2000,
                    "Negotiation", 2000,
                    "Close", 2000,
                  ]}
                  wrapper="span"
                  speed={50}
                  className="hero-type-animation text-primary dark:text-primary block relative z-10"
                  repeat={Infinity}
                  cursor={true}
                  style={{ display: 'inline-block', minWidth: '200px' }}
                />
                <motion.div
                  className="absolute inset-0 blur-2xl opacity-0 dark:opacity-50 -z-10"
                  style={{ background: "var(--primary)" }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>

              <motion.span
                className="block"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <span className="relative inline-block">
                  <span
                    className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary animate-spectrum-shift bg-clip-text text-transparent"
                    style={{ WebkitBackgroundClip: "text", backgroundClip: "text" }}
                  >
                    Before
                  </span>
                  <motion.div
                    className="absolute -bottom-2 left-0 w-full h-3 -z-10 rounded-lg animate-spectrum-shift"
                    style={{
                      background: "linear-gradient(90deg, var(--primary), var(--accent), var(--primary))",
                      backgroundSize: "200% 100%",
                    }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 0.4 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                  />
                </span>{" "}
                It Happens
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-lg md:text-xl text-text-secondary max-w-2xl mb-8 leading-relaxed font-medium"
            >
              Practice real sales conversations against{" "}
              <span className="text-text-primary font-bold">AI opponents</span> who
              push back, challenge you, and make you better.{" "}
              <span className="text-primary dark:text-accent font-bold">
                Prove you&apos;re ready
              </span>{" "}
              before real deals are on the line.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-start gap-6 mb-6"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  asChild
                  className="group relative overflow-hidden px-8 py-6 text-lg font-bold shadow-lg dark:shadow-primary/20"
                >
                  <Link href="/login">
                    <Mic2 className="w-5 h-5 mr-2" />
                    Start Practicing Free
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                      animate={{ translateX: ["100%", "100%", "-100%"] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-col gap-1"
              >
                <p className="text-text-muted text-sm font-medium">
                  &#10003; Free to start
                </p>
                <p className="text-text-muted text-sm font-medium">
                  &#10003; No credit card required
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* 3D Scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative h-[400px] lg:h-[480px]"
          >
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-primary/20"
              animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-[-10px] rounded-3xl border border-accent/20"
              animate={{ scale: [1, 1.08, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />

            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface/50 dark:bg-surface/10 backdrop-blur-sm border border-border shadow-2xl">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-accent/20"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </div>
                }
              >
                <HeroScene />
              </Suspense>
            </div>

            <motion.div
              className="absolute -top-4 -right-4 bg-primary/10 dark:bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-4 py-2 flex items-center gap-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: ["8px", "20px", "8px"] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-primary">LIVE</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Scroll to explore
        </span>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary/50 rounded-full"
              animate={{ height: ["12px", "24px", "12px"], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
