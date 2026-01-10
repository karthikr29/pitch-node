"use client";

import { motion } from "framer-motion";
import { TrendingUp, Award, Zap } from "lucide-react";

export default function LevelUpScene() {
    return (
        <div className="w-full h-full flex items-center justify-center relative">
            {/* Background Grid */}
            <div className="absolute inset-0 border-b border-white/5 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20%_100%] ml-8 pointer-events-none" />

            {/* Chart Bars */}
            <div className="flex items-end gap-3 h-48 mb-8 z-10">
                {[30, 45, 40, 60, 55, 80, 75, 95].map((height, i) => (
                    <motion.div
                        key={i}
                        className="w-8 rounded-t-lg bg-gradient-to-t from-primary/20 to-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        transition={{
                            duration: 0.8,
                            delay: i * 0.1,
                            ease: "easeOut",
                        }}
                        viewport={{ once: true }}
                    >
                        {/* Top Glow */}
                        <div className="w-full h-1 bg-white/50 rounded-full opacity-50" />
                    </motion.div>
                ))}
            </div>

            {/* Floating Stat Cards */}
            <motion.div
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-surface/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-3 z-20"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                animate={{ x: [0, 5, 0] }}
            >
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                    <TrendingUp size={16} />
                </div>
                <div>
                    <div className="text-xs text-text-secondary">Performance</div>
                    <div className="text-sm font-bold text-green-500">+124%</div>
                </div>
            </motion.div>

            <motion.div
                className="absolute top-10 left-10 bg-surface/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-3 z-20"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                animate={{ y: [0, 5, 0] }}
            >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <Award size={16} />
                </div>
                <div>
                    <div className="text-xs text-text-secondary">Skill Rank</div>
                    <div className="text-sm font-bold text-amber-500">Top 1%</div>
                </div>
            </motion.div>
        </div>
    );
}
