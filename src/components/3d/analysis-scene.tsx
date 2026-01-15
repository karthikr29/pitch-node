"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Simulated AI feedback data
const feedbackMetrics = [
  { label: "Objection Handling", value: 92, color: "from-emerald-400 to-green-500", icon: "🎯" },
  { label: "Active Listening", value: 88, color: "from-sky-400 to-blue-500", icon: "👂" },
  { label: "Closing Technique", value: 78, color: "from-amber-400 to-orange-500", icon: "🔥" },
  { label: "Rapport Building", value: 95, color: "from-violet-400 to-purple-500", icon: "🤝" },
];

const highlightMoments = [
  { time: "0:42", text: "Strong value proposition", type: "success" as const },
  { time: "1:15", text: "Handled price objection well", type: "success" as const },
  { time: "2:03", text: "Could improve urgency", type: "warning" as const },
];

function MetricBar({ metric, index }: { metric: typeof feedbackMetrics[0]; index: number }) {
  return (
    <motion.div
      className="space-y-1.5"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{metric.icon}</span>
          <span className="text-[10px] text-text-secondary font-medium">
            {metric.label}
          </span>
        </div>
        <motion.span
          className="text-xs font-bold text-text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 + index * 0.1 }}
        >
          {metric.value}%
        </motion.span>
      </div>
      <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", metric.color)}
          initial={{ width: 0 }}
          animate={{ width: `${metric.value}%` }}
          transition={{
            duration: 1,
            delay: 0.5 + index * 0.1,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        />
      </div>
    </motion.div>
  );
}

function HighlightMoment({ moment, index }: { moment: typeof highlightMoments[0]; index: number }) {
  const isSuccess = moment.type === "success";

  return (
    <motion.div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px]",
        isSuccess
          ? "bg-emerald-500/10 border border-emerald-500/20"
          : "bg-amber-500/10 border border-amber-500/20"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 + index * 0.15 }}
    >
      <span className={cn(
        "font-mono font-semibold",
        isSuccess ? "text-emerald-500" : "text-amber-500"
      )}>
        {moment.time}
      </span>
      <span className="text-text-secondary">{moment.text}</span>
    </motion.div>
  );
}

export default function AnalysisScene() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Main Analysis Card */}
      <motion.div
        className="relative"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Floating card effect */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotateX: [0, 2, 0],
            rotateY: [-2, 2, -2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformStyle: "preserve-3d", perspective: 1000 }}
        >
          {/* Card container */}
          <div className="relative w-full max-w-[280px] sm:w-64 bg-gradient-to-br from-surface via-surface to-background-secondary rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
            {/* Header with score */}
            <div className="relative px-4 pt-4 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                    Post-Game Analysis
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <motion.span
                      className="text-3xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    >
                      87
                    </motion.span>
                    <span className="text-sm text-text-muted">/100</span>
                  </div>
                </div>

                {/* Circular progress indicator */}
                <motion.div
                  className="relative w-12 h-12"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="3"
                    />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="url(#scoreGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="94.2"
                      initial={{ strokeDashoffset: 94.2 }}
                      animate={{ strokeDashoffset: 94.2 * (1 - 0.87) }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--accent)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">A-</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Metrics section */}
            <div className="px-4 py-3 space-y-2">
              {feedbackMetrics.map((metric, i) => (
                <MetricBar key={metric.label} metric={metric} index={i} />
              ))}
            </div>

            {/* Highlights section */}
            <div className="px-4 pb-4 space-y-1.5">
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">
                Key Moments
              </p>
              {highlightMoments.map((moment, i) => (
                <HighlightMoment key={moment.time} moment={moment} index={i} />
              ))}
            </div>

            {/* Decorative scan line */}
            <motion.div
              className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Shadow */}
          <div className="absolute -bottom-4 left-4 right-4 h-8 bg-black/10 dark:bg-black/30 rounded-full blur-xl" />
        </motion.div>
      </motion.div>

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-72 h-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
          animate={{
            opacity: [0.05, 0.1, 0.05],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
          }}
        />
      </div>
    </div>
  );
}
