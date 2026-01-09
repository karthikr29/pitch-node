"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AnalysisScene() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Clipboard / Scorecard */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -10, 0],
          rotateY: [-5, 5, -5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      >
        {/* Clipboard base */}
        <div className="relative w-48 h-64 bg-surface rounded-2xl shadow-lg border border-border overflow-hidden">
          {/* Clip */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-6 bg-primary rounded-t-xl" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-primary-hover rounded-full" />

          {/* Content area */}
          <div className="pt-8 px-4 space-y-3">
            {/* Score header */}
            <div className="text-center">
              <motion.div
                className="text-3xl font-display font-bold text-primary"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                87
              </motion.div>
              <div className="text-xs text-text-muted">Overall Score</div>
            </div>

            {/* Metric bars */}
            {[
              { label: "Objection Handling", value: 85, color: "bg-success" },
              { label: "Active Listening", value: 92, color: "bg-primary" },
              { label: "Closing Technique", value: 78, color: "bg-accent" },
              { label: "Rapport Building", value: 88, color: "bg-success" },
            ].map((metric, i) => (
              <div key={metric.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary truncate">
                    {metric.label}
                  </span>
                  <span className="text-text-primary font-medium">
                    {metric.value}%
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", metric.color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value}%` }}
                    transition={{ duration: 1, delay: 0.2 * i }}
                  />
                </div>
              </div>
            ))}

            {/* Checkmarks */}
            <div className="pt-2 space-y-1.5">
              {["Clear value prop", "Handled price objection"].map((item, i) => (
                <motion.div
                  key={item}
                  className="flex items-center gap-2 text-xs text-text-secondary"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.2 }}
                >
                  <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Shadow */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-4 bg-black/10 dark:bg-black/30 rounded-full blur-md" />
      </motion.div>

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
