"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenWaitlist?: () => void;
}

export function Header({ onOpenWaitlist }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        "w-[calc(100%-32px)] max-w-5xl",
        "bg-surface/80 dark:bg-surface/60",
        "backdrop-blur-xl backdrop-saturate-150",
        "border border-border/50",
        "rounded-2xl",
        "shadow-lg shadow-black/5 dark:shadow-black/20",
        "transition-all duration-300",
        isScrolled && "shadow-xl shadow-black/10 dark:shadow-black/30"
      )}
    >
      <div className="px-4 sm:px-6">
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-300",
            isScrolled ? "h-12" : "h-14"
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className={cn(
                "relative transition-all duration-300 group-hover:scale-105",
                isScrolled ? "w-8 h-8" : "w-9 h-9"
              )}
            >
              <Image
                src="/branding/logo.svg"
                alt="PitchNode Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span
              className={cn(
                "font-display font-bold text-text-primary transition-all duration-300",
                isScrolled ? "text-base" : "text-lg"
              )}
            >
              PitchNode
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className={cn(
                "font-medium text-text-secondary hover:text-text-primary transition-all duration-300",
                isScrolled ? "text-[0.8125rem]" : "text-sm"
              )}
            >
              How it Works
            </a>
            <a
              href="#features"
              className={cn(
                "font-medium text-text-secondary hover:text-text-primary transition-all duration-300",
                isScrolled ? "text-[0.8125rem]" : "text-sm"
              )}
            >
              Features
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {onOpenWaitlist && (
              <Button
                size="sm"
                onClick={onOpenWaitlist}
                className="hidden sm:inline-flex"
              >
                Join Waitlist
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
