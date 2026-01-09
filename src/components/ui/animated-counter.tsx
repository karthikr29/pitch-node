"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  className = "",
  duration = 1.5,
}: AnimatedCounterProps) {
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const displayValue = useTransform(springValue, (latest) =>
    Math.round(latest).toLocaleString()
  );

  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      springValue.set(value);
      prevValue.current = value;
    } else if (springValue.get() === 0) {
      springValue.set(value);
    }
  }, [value, springValue]);

  return <motion.span className={className}>{displayValue}</motion.span>;
}
