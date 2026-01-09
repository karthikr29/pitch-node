"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

// Use useSyncExternalStore to safely detect client-side mounting
// This avoids the setState-in-effect lint error
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const isMounted = useIsMounted();

  if (!isMounted) {
    return (
      <button
        className={cn(
          "relative p-2 rounded-full",
          "bg-background-secondary",
          "transition-colors duration-200"
        )}
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative p-2 rounded-full",
        "bg-background-secondary",
        "hover:bg-border",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {isDark ? (
            <Moon className="w-5 h-5 text-text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-text-primary" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
