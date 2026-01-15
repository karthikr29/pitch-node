"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";

// Represents one participant in the voice conversation
function VoiceWaveform({
  side,
  isActive,
  color,
  delay = 0
}: {
  side: "left" | "right";
  isActive: boolean;
  color: string;
  delay?: number;
}) {
  const barCount = 12;
  const baseDelay = delay;

  return (
    <div className={`flex items-center gap-[3px] ${side === "right" ? "flex-row-reverse" : ""}`}>
      {Array.from({ length: barCount }).map((_, i) => {
        // Create varying heights for natural waveform look
        const baseHeight = Math.sin((i / barCount) * Math.PI) * 0.7 + 0.3;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              background: color,
              width: "3px",
            }}
            animate={isActive ? {
              height: [
                `${baseHeight * 8}px`,
                `${baseHeight * 28 + Math.random() * 12}px`,
                `${baseHeight * 12}px`,
                `${baseHeight * 32 + Math.random() * 8}px`,
                `${baseHeight * 8}px`,
              ],
              opacity: [0.6, 1, 0.8, 1, 0.6],
            } : {
              height: `${baseHeight * 8}px`,
              opacity: 0.3,
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              repeat: Infinity,
              delay: baseDelay + i * 0.05,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

// Circular neural network visualization for AI
function NeuralCore({ isListening }: { isListening: boolean }) {
  const nodes = 8;
  const radius = 45;

  return (
    <div className="relative w-28 h-28">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, transparent 40%, var(--primary) 100%)`,
          opacity: 0.15,
        }}
        animate={{
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Neural nodes */}
      {Array.from({ length: nodes }).map((_, i) => {
        const angle = (i / nodes) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <motion.div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full bg-primary"
            style={{
              left: `calc(50% + ${x}px - 5px)`,
              top: `calc(50% + ${y}px - 5px)`,
              boxShadow: "0 0 10px var(--primary)",
            }}
            animate={{
              scale: isListening ? [1, 1.4, 1] : 1,
              opacity: isListening ? [0.7, 1, 0.7] : 0.5,
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Connecting lines between nodes */}
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
        {Array.from({ length: nodes }).map((_, i) => {
          const angle1 = (i / nodes) * 2 * Math.PI - Math.PI / 2;
          const angle2 = ((i + 1) % nodes / nodes) * 2 * Math.PI - Math.PI / 2;
          const x1 = 56 + Math.cos(angle1) * radius;
          const y1 = 56 + Math.sin(angle1) * radius;
          const x2 = 56 + Math.cos(angle2) * radius;
          const y2 = 56 + Math.sin(angle2) * radius;

          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--primary)"
              strokeWidth="1"
              animate={{
                opacity: isListening ? [0.2, 0.6, 0.2] : 0.15,
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.1,
                repeat: Infinity,
              }}
            />
          );
        })}
      </svg>

      {/* Center core */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          boxShadow: "0 0 30px var(--primary), inset 0 0 20px rgba(255,255,255,0.2)",
        }}
        animate={{
          scale: isListening ? [1, 1.1, 1] : [1, 1.05, 1],
        }}
        transition={{
          duration: isListening ? 0.5 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner pulse ring */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-primary/40"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
    </div>
  );
}

// User avatar representation
function UserAvatar({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div className="relative">
      {/* Speaking indicator ring */}
      {isSpeaking && (
        <motion.div
          className="absolute -inset-2 rounded-full border-2 border-accent/50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        />
      )}

      {/* Avatar circle */}
      <motion.div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, var(--secondary), #1a2332)",
          border: "2px solid var(--border)",
          boxShadow: isSpeaking ? "0 0 20px var(--accent)" : "0 4px 20px rgba(0,0,0,0.3)",
        }}
        animate={{
          scale: isSpeaking ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: isSpeaking ? Infinity : 0,
        }}
      >
        {/* User icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      </motion.div>
    </div>
  );
}

// Connection beam between user and AI
function ConnectionBeam({ isActive }: { isActive: boolean }) {
  return (
    <div className="relative h-1 flex-1 mx-4 overflow-hidden rounded-full">
      <div className="absolute inset-0 bg-border/30 rounded-full" />

      {/* Flowing particles */}
      <motion.div
        className="absolute inset-y-0 w-8 rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
        }}
        animate={{
          x: isActive ? ["-100%", "500%"] : "-100%",
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute inset-y-0 w-4 rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
        }}
        animate={{
          x: isActive ? ["500%", "-100%"] : "500%",
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "linear",
          delay: 0.3,
        }}
      />
    </div>
  );
}

// Floating conversation indicators
function ConversationIndicator({ text, side, delay }: { text: string; side: "left" | "right"; delay: number }) {
  return (
    <motion.div
      className="px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{
        background: side === "left" ? "var(--secondary)" : "var(--primary)",
        color: side === "left" ? "var(--text-on-primary)" : "#0C0A09",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [10, 0, 0, -10],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        repeatDelay: 4,
      }}
    >
      {text}
    </motion.div>
  );
}

// Main Hero Scene Component
export default function HeroScene() {
  const [conversationPhase, setConversationPhase] = useState(0);

  // Simulate conversation phases: 0 = user speaking, 1 = AI processing, 2 = AI responding
  useEffect(() => {
    const interval = setInterval(() => {
      setConversationPhase((prev) => (prev + 1) % 3);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const isUserSpeaking = conversationPhase === 0;
  const isAIProcessing = conversationPhase === 1;
  const isAIResponding = conversationPhase === 2;

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full blur-3xl"
          style={{ background: "var(--primary)", opacity: 0.08 }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl"
          style={{ background: "var(--accent)", opacity: 0.06 }}
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -20, 0],
          }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      {/* Main conversation visualization */}
      <div className="relative flex flex-col items-center gap-6 pt-12">
        {/* Floating text indicators - positioned inside visible area */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-2">
          <ConversationIndicator
            text="Your pitch..."
            side="left"
            delay={0}
          />
          <ConversationIndicator
            text="AI Response"
            side="right"
            delay={4}
          />
        </div>

        {/* Main interaction area */}
        <div className="flex items-center gap-6">
          {/* User Side */}
          <div className="flex flex-col items-center gap-4">
            <UserAvatar isSpeaking={isUserSpeaking} />
            <VoiceWaveform
              side="left"
              isActive={isUserSpeaking}
              color="var(--accent)"
            />
            <motion.span
              className="text-xs font-medium"
              style={{ color: isUserSpeaking ? "var(--accent)" : "var(--text-muted)" }}
            >
              You
            </motion.span>
          </div>

          {/* Connection visualization */}
          <div className="flex flex-col items-center gap-2 w-24">
            <ConnectionBeam isActive={isAIProcessing || isAIResponding} />
            <motion.div
              className="flex items-center gap-1"
              animate={{
                opacity: isAIProcessing ? 1 : 0,
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* AI Side */}
          <div className="flex flex-col items-center gap-4">
            <NeuralCore isListening={isAIResponding} />
            <VoiceWaveform
              side="right"
              isActive={isAIResponding}
              color="var(--primary)"
              delay={0.1}
            />
            <motion.span
              className="text-xs font-medium"
              style={{ color: isAIResponding ? "var(--primary)" : "var(--text-muted)" }}
            >
              AI Opponent
            </motion.span>
          </div>
        </div>

        {/* Status indicator */}
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
          animate={{
            boxShadow: isUserSpeaking
              ? "0 0 20px var(--accent)"
              : isAIResponding
                ? "0 0 20px var(--primary)"
                : "none",
          }}
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              background: isUserSpeaking
                ? "var(--accent)"
                : isAIResponding
                  ? "var(--primary)"
                  : "var(--text-muted)",
            }}
            animate={{
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
            }}
          />
          <span className="text-xs font-medium text-text-secondary">
            {isUserSpeaking
              ? "Listening to your pitch..."
              : isAIProcessing
                ? "AI analyzing response..."
                : "AI pushing back..."}
          </span>
        </motion.div>
      </div>

      {/* Decorative corner elements */}
      <motion.div
        className="absolute top-8 right-8 w-20 h-20"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-10">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="10 5" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-8 w-16 h-16"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-10">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="8 4" />
        </svg>
      </motion.div>
    </div>
  );
}
