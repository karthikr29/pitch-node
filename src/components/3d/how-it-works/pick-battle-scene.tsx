"use client";

import { motion } from "framer-motion";
import { Phone, Search, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

const scenarios = [
    {
        id: "cold-call",
        label: "Cold Call",
        icon: Phone,
        color: "from-blue-500 to-indigo-600",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        x: -80,
        y: -20,
        delay: 0,
    },
    {
        id: "discovery",
        label: "Discovery",
        icon: Search,
        color: "from-purple-500 to-pink-600",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        x: 80,
        y: 20,
        delay: 0.2,
    },
    {
        id: "negotiation",
        label: "Negotiation",
        icon: Handshake,
        color: "from-emerald-500 to-teal-600",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        x: 0,
        y: 60,
        delay: 0.4,
    },
];

export default function PickBattleScene() {
    return (
        <div className="w-full h-full flex items-center justify-center relative select-none">
            {/* Orbiting Scenarios */}
            {scenarios.map((scenario, i) => (
                <motion.div
                    key={scenario.id}
                    className={cn(
                        "absolute flex flex-col items-center gap-2 p-4 rounded-xl backdrop-blur-md border shadow-xl cursor-default",
                        scenario.bg,
                        scenario.border
                    )}
                    style={{ x: scenario.x, y: scenario.y }}
                    animate={{
                        y: [scenario.y, scenario.y - 15, scenario.y],
                    }}
                    transition={{
                        duration: 3,
                        delay: scenario.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    whileHover={{ scale: 1.05, zIndex: 20 }}
                >
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-inner",
                        scenario.color
                    )}>
                        <scenario.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-text-primary tracking-wide">
                        {scenario.label}
                    </span>

                    {/* Connection Line to Center (Visual only) */}
                    <svg className="absolute top-1/2 left-1/2 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10 opacity-20">
                        <line x1="100" y1="100" x2="100" y2="100" stroke="currentColor" />
                    </svg>
                </motion.div>
            ))}
        </div>
    );
}
