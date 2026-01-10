"use client";

import { motion } from "framer-motion";
import { Check, Mail, Sparkles, Trophy, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface ThankYouProps {
  name: string;
  email: string;
  onClose: () => void;
}

// Confetti particle component
function ConfettiParticle({ delay }: { delay: number }) {
  const randomX = Math.random() * 100 - 50;
  const randomRotate = Math.random() * 360;
  const randomColor = ["var(--primary)", "var(--accent)", "#FBBF24", "#2DD4BF"][
    Math.floor(Math.random() * 4)
  ];

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{
        background: randomColor,
        top: "20%",
        left: "50%",
      }}
      initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
        x: randomX,
        y: [0, 100, 200],
        rotate: randomRotate,
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: "easeOut",
      }}
    />
  );
}

export function ThankYou({ name, email, onClose }: ThankYouProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="text-center relative"
    >
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.05} />
          ))}
        </div>
      )}

      {/* Success icon with animated rings */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="mb-8 inline-flex relative"
      >
        {/* Outer pulsing rings */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.5, 0, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent/30"
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.5, 0, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.5,
          }}
        />

        {/* Main icon container */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center border border-primary/20">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <Check className="w-9 h-9 text-white" strokeWidth={3} />
          </motion.div>
        </div>

        {/* Decorative sparkles */}
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="w-7 h-7 text-accent fill-accent/20" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: 45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="absolute -bottom-1 -left-1"
        >
          <Sparkles className="w-5 h-5 text-primary fill-primary/20" />
        </motion.div>
      </motion.div>

      {/* Main headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
      >
        <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
          Welcome aboard, {name}!
        </span>
      </motion.h1>

      {/* Success message */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-text-secondary text-lg md:text-xl mb-8 max-w-lg mx-auto"
      >
        You&apos;re officially on the list! We&apos;ll notify you the moment we launch.
      </motion.p>

      {/* Email confirmation card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-surface/60 backdrop-blur-sm border border-border/50 shadow-lg mb-10"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-text-muted text-xs font-medium mb-0.5">Confirmation sent to</p>
          <p className="text-primary font-semibold">{email}</p>
        </div>
      </motion.div>

      {/* What happens next section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mb-10 space-y-4 max-w-md mx-auto"
      >
        <p className="text-text-primary font-semibold text-sm uppercase tracking-wider mb-4">
          What&apos;s next?
        </p>

        <div className="flex items-start gap-4 text-left">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-1">Get Early Access</h3>
            <p className="text-text-muted text-sm">
              You&apos;ll be among the first to practice with AI sales opponents
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 text-left">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-1">Level Up Your Skills</h3>
            <p className="text-text-muted text-sm">
              Master objections, perfect your pitch, and close more deals
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClose}
        className="px-8 py-3.5 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-full shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40"
      >
        Got it, thanks!
      </motion.button>

      {/* Footer tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mt-8 text-text-muted text-sm"
      >
        We&apos;ll see you soon. Time to dominate those sales calls! 🚀
      </motion.p>
    </motion.div>
  );
}
