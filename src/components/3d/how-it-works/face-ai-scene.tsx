"use client";

import { motion } from "framer-motion";

export default function FaceAiScene() {
    return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            {/* AI Voice (Red/Aggressive) - Right Side */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={`ai-${i}`}
                        className="w-2 rounded-full bg-gradient-to-t from-red-500 to-orange-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        animate={{
                            height: [20, 40 + Math.random() * 60, 20],
                            opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                            duration: 0.5 + Math.random() * 0.5,
                            repeat: Infinity,
                            repeatType: "mirror",
                            ease: "easeInOut",
                            delay: i * 0.1,
                        }}
                    />
                ))}
            </div>

            {/* User Voice (Blue/Calm) - Left Side */}
            <div className="absolute left-10 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={`user-${i}`}
                        className="w-2 rounded-full bg-gradient-to-t from-blue-500 to-cyan-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                        animate={{
                            height: [20, 30 + Math.random() * 40, 20],
                            opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                            duration: 0.8 + Math.random() * 0.5,
                            repeat: Infinity,
                            repeatType: "mirror",
                            ease: "easeInOut",
                            delay: i * 0.1,
                        }}
                    />
                ))}
            </div>

            {/* Interaction Zone (Clash) */}
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Outer glow ring */}
                <motion.div
                    className="absolute w-28 h-28 rounded-full border-2 border-primary/40"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Main blob with gradient */}
                <motion.div
                    className="w-20 h-20 rounded-full"
                    style={{
                        background: `radial-gradient(circle, var(--accent) 0%, var(--primary) 60%, transparent 100%)`,
                        boxShadow: `0 0 40px var(--primary), 0 0 60px var(--accent)`,
                    }}
                    animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.5, 0.85, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Inner bright core */}
                <motion.div
                    className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-white/70 to-white/30"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Particles flying */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={`p-${i}`}
                        className="absolute w-1 h-1 rounded-full bg-white"
                        animate={{
                            x: range(-100, 100),
                            y: range(-50, 50),
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function range(min: number, max: number) {
    return Math.random() * (max - min) + min;
}
