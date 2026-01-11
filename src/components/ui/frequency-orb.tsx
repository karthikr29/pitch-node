"use client";

import { motion } from "framer-motion";

interface FrequencyOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "accent";
  className?: string;
}

const sizeClasses = {
  sm: "w-32 h-32",
  md: "w-48 h-48",
  lg: "w-64 h-64",
  xl: "w-96 h-96",
};

export function FrequencyOrb({
  size = "md",
  variant = "primary",
  className = "",
}: FrequencyOrbProps) {
  const colorMap = {
    primary: "var(--primary)",
    secondary: "var(--secondary)",
    accent: "var(--accent)",
  };

  const color = colorMap[variant];

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Middle ring */}
      <motion.div
        className="absolute inset-[10%] rounded-full border-2"
        style={{
          borderColor: color,
          boxShadow: `0 0 20px ${color}40`,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />

      {/* Inner core */}
      <motion.div
        className="absolute inset-[25%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color} 0%, ${color}80 50%, transparent 100%)`,
          boxShadow: `0 0 40px ${color}, inset 0 0 20px ${color}`,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6,
        }}
      />

      {/* Frequency pulses */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-[30%] rounded-full border"
          style={{
            borderColor: color,
            rotate: `${i * 45}deg`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
