"use client";

import { useEffect, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui";

interface ExperienceStepProps {
  value: number;
  onChange: (value: number) => void;
  onSubmit: () => void;
  onPrev: () => void;
  isSubmitting: boolean;
  error?: string | null;
  setError: (error: string | null) => void;
  stepNumber: number;
  totalSteps: number;
}

const experienceLabels: Record<number, string> = {
  1: "Just starting out",
  2: "Beginner",
  3: "Learning the basics",
  4: "Getting comfortable",
  5: "Intermediate",
  6: "Fairly experienced",
  7: "Experienced",
  8: "Very experienced",
  9: "Expert",
  10: "Pitch master",
};

export function ExperienceStep({
  value,
  onChange,
  onSubmit,
  onPrev,
  isSubmitting,
  error,
  setError,
  stepNumber,
  totalSteps,
}: ExperienceStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if user is on Mac or Windows
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    const timer = setTimeout(() => containerRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    setError(null);
    onSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Submit only with Ctrl+Enter (Windows) or Cmd+Enter (Mac)
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "ArrowLeft" && value > 1) {
      e.preventDefault();
      onChange(value - 1);
    } else if (e.key === "ArrowRight" && value < 10) {
      e.preventDefault();
      onChange(value + 1);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="outline-none"
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
        How would you rate your sales & pitching experience?
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-text-secondary text-lg mb-10"
      >
        Help us tailor your experience to match your skill level.
      </motion.p>

      {/* Value display with underline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-16"
      >
        <div className="flex items-baseline gap-4 border-b-2 border-border pb-4 transition-colors duration-300 focus-within:border-primary mb-12">
          <motion.div
            key={value}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-5xl md:text-6xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          >
            {value}
          </motion.div>
          <motion.div
            key={`label-${value}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xl md:text-2xl text-text-secondary font-medium flex-1"
          >
            {experienceLabels[value]}
          </motion.div>
        </div>

        {/* Slider with simplified markers */}
        <div>
          <Slider
            value={[value]}
            onValueChange={(values) => {
              onChange(values[0]);
              if (error) setError(null);
            }}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />

          {/* Simple scale numbers only */}
          <div className="flex justify-between mt-3 text-[10px] text-text-muted/60 font-medium">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
            <span>8</span>
            <span>9</span>
            <span>10</span>
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-error text-sm"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Buttons with proper spacing */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4 mt-8"
      >
        <button
          onClick={onPrev}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-3 text-text-secondary font-medium rounded-full transition-all duration-200 hover:bg-surface hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-3 px-6 py-3 bg-primary text-white font-medium rounded-full transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit
              <span className="flex items-center justify-center w-5 h-5 bg-white/20 rounded text-xs">
                <ArrowRight className="w-3 h-3" />
              </span>
            </>
          )}
        </button>
        {!isSubmitting && (
          <span className="text-text-muted text-sm">
            press <kbd className="font-mono text-text-secondary">{modifierKey}+Enter ↵</kbd>
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
