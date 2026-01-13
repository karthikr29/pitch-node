"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWaitlistCount } from "@/hooks/use-waitlist-count";
import { Button } from "@/components/ui/button";

interface WaitlistNudgeProps {
    isOpen: boolean;
    onClose: () => void;
    onJoin: () => void;
}

export function WaitlistNudge({ isOpen, onClose, onJoin }: WaitlistNudgeProps) {
    const { count, isLoading } = useWaitlistCount({
        initialCount: 18,
        pollingInterval: 10000,
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed bottom-6 right-6 z-[60] w-full max-w-sm"
                >
                    <div className={cn(
                        "relative p-5 rounded-2xl",
                        "bg-surface border border-border/50 shadow-2xl",
                        "backdrop-blur-md supports-[backdrop-filter]:bg-surface/80"
                    )}>
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col gap-4">
                            {/* Header with Avatars and Count */}
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2.5">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-9 h-9 rounded-full border-2 border-surface",
                                                "bg-gradient-to-br from-primary/20 to-primary/10",
                                                "flex items-center justify-center overflow-hidden"
                                            )}
                                        >
                                            <Users className="w-4 h-4 text-primary opacity-80" />
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-display font-bold text-xl text-text-primary tabular-nums tracking-tight">
                                            {count.toLocaleString()}
                                        </span>
                                        <span className="text-text-secondary text-sm font-medium">
                                            ahead
                                        </span>
                                        <span className="text-text-muted text-sm">•</span>
                                        <span className="text-primary text-sm font-semibold">
                                            Be next
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-text-secondary leading-normal">
                                    Don't miss out on securing your spot for the next generation of sales and pitch training.
                                </p>

                                <Button
                                    onClick={onJoin}
                                    className="w-full group"
                                >
                                    <span>Join the Waitlist</span>
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
