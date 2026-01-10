"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Weekly progress data
const weeklyData = [
  { day: "Mon", sessions: 2, score: 72 },
  { day: "Tue", sessions: 3, score: 78 },
  { day: "Wed", sessions: 1, score: 75 },
  { day: "Thu", sessions: 4, score: 82 },
  { day: "Fri", sessions: 3, score: 85 },
  { day: "Sat", sessions: 2, score: 88 },
  { day: "Sun", sessions: 1, score: 91 },
];

const achievements = [
  { icon: "🔥", label: "7 Day Streak", progress: 100 },
  { icon: "🎯", label: "Objection Master", progress: 85 },
  { icon: "⚡", label: "Quick Closer", progress: 60 },
];

// Animated progress chart
function ProgressChart() {
  const maxScore = 100;
  const chartHeight = 80;

  return (
    <div className="relative h-24 px-2">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-full h-px bg-border/30" />
        ))}
      </div>

      {/* Bars and line chart */}
      <div className="relative h-full flex items-end justify-between gap-1">
        {weeklyData.map((data, i) => (
          <div key={data.day} className="flex flex-col items-center gap-1 flex-1">
            {/* Score bar */}
            <motion.div
              className="w-full rounded-t-sm relative overflow-hidden"
              style={{
                background: `linear-gradient(to top, var(--primary), var(--accent))`,
              }}
              initial={{ height: 0 }}
              animate={{ height: `${(data.score / maxScore) * chartHeight}px` }}
              transition={{
                duration: 0.8,
                delay: 0.3 + i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-200%", "200%"] }}
                transition={{
                  duration: 2,
                  delay: 1 + i * 0.2,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              />
            </motion.div>

            {/* Day label */}
            <span className="text-[8px] text-text-muted font-medium">{data.day}</span>
          </div>
        ))}
      </div>

      {/* Trend line connecting tops */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ top: 0 }}
        preserveAspectRatio="none"
      >
        <motion.path
          d={`M ${weeklyData.map((data, i) => {
            const x = (i / (weeklyData.length - 1)) * 100;
            const y = 100 - (data.score / maxScore) * 80;
            return `${x}%,${y}%`;
          }).join(" L ")}`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        />
      </svg>
    </div>
  );
}

// Achievement badge
function AchievementBadge({ achievement, index }: { achievement: typeof achievements[0]; index: number }) {
  return (
    <motion.div
      className="flex items-center gap-2 p-2 rounded-xl bg-surface/50 border border-border/30"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2 + index * 0.15 }}
    >
      <span className="text-lg">{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-text-primary truncate">
          {achievement.label}
        </p>
        <div className="h-1 bg-border/50 rounded-full overflow-hidden mt-1">
          <motion.div
            className={cn(
              "h-full rounded-full",
              achievement.progress === 100
                ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                : "bg-gradient-to-r from-primary to-accent"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${achievement.progress}%` }}
            transition={{ duration: 0.8, delay: 1.5 + index * 0.15 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function ProgressScene() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Main Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Card container */}
          <div className="relative w-64 bg-gradient-to-br from-surface via-surface to-background-secondary rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                    Your Progress
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <motion.span
                      className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    >
                      +19%
                    </motion.span>
                    <span className="text-xs text-success font-medium">this week</span>
                  </div>
                </div>

                {/* Streak badge */}
                <motion.div
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  <span className="text-sm">🔥</span>
                  <span className="text-xs font-bold text-amber-500">7</span>
                </motion.div>
              </div>
            </div>

            {/* Chart section */}
            <div className="px-2 py-3">
              <ProgressChart />
            </div>

            {/* Stats row */}
            <div className="px-4 py-2 grid grid-cols-3 gap-2 border-t border-border/30">
              {[
                { label: "Sessions", value: "16" },
                { label: "Avg Score", value: "82" },
                { label: "Best", value: "91" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                >
                  <p className="text-lg font-display font-bold text-text-primary">{stat.value}</p>
                  <p className="text-[9px] text-text-muted">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Achievements section */}
            <div className="px-3 pb-4 pt-2 space-y-1.5 border-t border-border/30">
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider px-1 mb-2">
                Achievements
              </p>
              {achievements.map((achievement, i) => (
                <AchievementBadge key={achievement.label} achievement={achievement} index={i} />
              ))}
            </div>
          </div>

          {/* Shadow */}
          <div className="absolute -bottom-4 left-4 right-4 h-8 bg-black/10 dark:bg-black/30 rounded-full blur-xl" />
        </motion.div>
      </motion.div>

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-72 h-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
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
