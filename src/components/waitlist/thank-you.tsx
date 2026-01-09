"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

interface ThankYouProps {
  name: string;
  email: string;
  onClose: () => void;
}

export function ThankYou({ name, email, onClose }: ThankYouProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="text-center"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="mb-8 inline-flex"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <Check className="w-10 h-10 text-primary" strokeWidth={2.5} />
            </motion.div>
          </div>
          
          {/* Sparkle decorations */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="w-6 h-6 text-accent" />
          </motion.div>
        </div>
      </motion.div>

      {/* Main message */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4"
      >
        You&apos;re in, {name}!
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-text-secondary text-lg mb-4 max-w-md mx-auto"
      >
        We&apos;ll send a confirmation to
      </motion.p>

      {/* Email highlight */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-primary font-medium text-lg mb-10"
      >
        {email}
      </motion.p>

      {/* Close button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onClose}
        className="px-8 py-3 border border-border hover:border-text-muted text-text-primary font-medium rounded-full transition-colors duration-200"
      >
        Close
      </motion.button>

      {/* Fun footer message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 text-text-muted text-sm"
      >
        Get ready to level up your sales game 🚀
      </motion.p>
    </motion.div>
  );
}
