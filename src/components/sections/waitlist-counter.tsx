"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWaitlistCount } from "@/hooks/use-waitlist-count";

export function WaitlistCounter() {
  const { count, isLoading } = useWaitlistCount({
    initialCount: 27,
    pollingInterval: 10000,
  });

  if (isLoading && count === 27) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={cn(
        "inline-flex items-center gap-3 px-5 py-2.5 rounded-full",
        "bg-surface border border-border/50 shadow-md",
        "text-sm font-medium text-text-secondary"
      )}
    >
      <div className="flex -space-x-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-7 h-7 rounded-full border-2 border-surface",
              "bg-gradient-to-br from-primary/20 to-primary/10",
              "flex items-center justify-center overflow-hidden"
            )}
          >
            <Users className="w-4 h-4 text-primary opacity-80" />
          </div>
        ))}
      </div>
      <span className="ml-1 flex items-baseline gap-1.5">
        <span className="font-display font-bold text-xl text-text-primary tabular-nums tracking-tight">
          {count.toLocaleString()}
        </span>
        <span className="text-text-secondary font-medium">
          ahead of you
        </span>
      </span>
    </motion.div>
  );
}
