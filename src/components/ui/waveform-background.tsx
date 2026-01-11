"use client";

import { motion } from "framer-motion";

interface WaveformBackgroundProps {
  className?: string;
  variant?: "primary" | "secondary" | "accent";
  animated?: boolean;
}

// Pre-computed deterministic heights for each bar (0-39)
// These are fixed values to avoid any SSR/client mismatch
const BAR_HEIGHTS = [
  45, 72, 33, 58, 67, 28, 76, 41, 53, 69,
  35, 62, 48, 79, 25, 55, 71, 38, 64, 50,
  73, 29, 60, 44, 77, 32, 57, 68, 42, 75,
  36, 63, 49, 70, 26, 54, 66, 39, 61, 47
];

export function WaveformBackground({
  className = "",
  variant = "primary",
  animated = true,
}: WaveformBackgroundProps) {
  const colors = {
    primary: "var(--wave-1)",
    secondary: "var(--wave-2)",
    accent: "var(--wave-3)",
  };

  const color = colors[variant];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Frequency Grid Pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(var(--frequency-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--frequency-grid) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Animated Waveform Layers */}
      <svg
        className={`absolute inset-0 w-full h-full ${animated ? "animate-waveform" : ""}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
      >
        {/* Wave 1 - Primary */}
        <motion.path
          d="M0,300 Q150,250 300,300 T600,300 T900,300 T1200,300"
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Wave 2 - Secondary (offset) */}
        <motion.path
          d="M0,320 Q150,280 300,320 T600,320 T900,320 T1200,320"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 2, delay: 0.2, ease: "easeInOut" }}
        />

        {/* Wave 3 - Tertiary (offset) */}
        <motion.path
          d="M0,280 Q150,240 300,280 T600,280 T900,280 T1200,280"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.4, ease: "easeInOut" }}
        />
      </svg>

      {/* Frequency Bars (Audio Spectrum Effect) */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-32 px-8 gap-2">
        {BAR_HEIGHTS.map((height, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-current rounded-t-sm"
            style={{
              color,
              height: `${height}%`,
            }}
            animate={
              animated
                ? {
                  scaleY: [0.3, 0.8, 1, 0.6, 0.3],
                  opacity: [0.4, 0.7, 1, 0.6, 0.4],
                }
                : {}
            }
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.05,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
