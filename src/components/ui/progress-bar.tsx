"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
}

export function ProgressBar({ progress, className }: ProgressBarProps) {
  return (
    <div
      className={cn(
        "w-full h-1 bg-border rounded-full overflow-hidden",
        className
      )}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function ProgressDots({
  currentStep,
  totalSteps,
  className,
}: ProgressDotsProps) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-colors duration-200",
            i < currentStep ? "bg-primary" : "bg-border"
          )}
          initial={false}
          animate={{
            scale: i === currentStep - 1 ? 1.25 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
}
