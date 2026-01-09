"use client";

import { motion } from "framer-motion";

export default function ProgressScene() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Trophy */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -8, 0],
          rotateY: [0, 360],
        }}
        transition={{
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 15, repeat: Infinity, ease: "linear" },
        }}
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      >
        {/* Trophy cup */}
        <div className="relative">
          {/* Cup body */}
          <div className="w-24 h-28 bg-gradient-to-b from-accent via-yellow-500 to-accent rounded-b-full relative overflow-hidden">
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: [-100, 100] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
            
            {/* Inner shadow */}
            <div className="absolute top-2 left-2 right-2 h-8 bg-black/10 rounded-t-full" />
          </div>

          {/* Handles */}
          <div className="absolute top-4 -left-4 w-6 h-12 border-4 border-accent rounded-l-full border-r-0" />
          <div className="absolute top-4 -right-4 w-6 h-12 border-4 border-accent rounded-r-full border-l-0" />

          {/* Stem */}
          <div className="w-6 h-6 mx-auto bg-gradient-to-b from-accent to-yellow-600" />

          {/* Base */}
          <div className="w-16 h-4 mx-auto bg-gradient-to-b from-stone-400 to-stone-500 rounded-sm" />
          <div className="w-20 h-3 mx-auto bg-gradient-to-b from-stone-500 to-stone-600 rounded-sm" />
        </div>

        {/* Star burst */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-8 bg-accent/30"
            style={{
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: "center bottom",
            }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              repeat: Infinity,
            }}
          />
        ))}
      </motion.div>

      {/* Rising graph behind trophy */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-end gap-2 opacity-30">
        {[40, 55, 45, 70, 65, 85, 90].map((height, i) => (
          <motion.div
            key={i}
            className="w-4 bg-primary/50 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${height}px` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
