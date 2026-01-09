"use client";

import { useEffect, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { validateName } from "@/lib/validators";

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  error?: string | null;
  setError: (error: string | null) => void;
  stepNumber: number;
  totalSteps: number;
}

export function NameStep({
  value,
  onChange,
  onNext,
  error,
  setError,
  stepNumber,
  totalSteps,
}: NameStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount with a slight delay for animation
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    const validation = validateName(value);
    if (!validation.valid) {
      setError(validation.error || "Please enter your name");
      return;
    }
    setError(null);
    onNext();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Step indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-8"
      >
        <span className="font-medium text-primary">{stepNumber}</span>
        <span className="text-text-muted">→</span>
        <span className="text-text-muted text-sm">{totalSteps} questions</span>
      </motion.div>

      {/* Question */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4"
      >
        What&apos;s your name?
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-text-secondary text-lg mb-10"
      >
        We&apos;d love to know who&apos;s joining us.
      </motion.p>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type your full name..."
          className="w-full bg-transparent text-2xl md:text-3xl text-text-primary placeholder:text-text-muted/50 border-b-2 border-border pb-4 outline-none transition-colors duration-300 focus:border-primary"
          autoComplete="name"
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-error text-sm"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={handleNext}
          className="inline-flex items-center gap-3 px-6 py-3 bg-primary text-white font-medium rounded-full transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
        >
          OK
          <span className="flex items-center justify-center w-5 h-5 bg-white/20 rounded text-xs">
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
        <span className="text-text-muted text-sm">
          press <kbd className="font-mono text-text-secondary">Enter ↵</kbd>
        </span>
      </motion.div>
    </motion.div>
  );
}
