"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { WaitlistProvider } from "@/contexts/waitlist-context";
import { WaitlistTimer } from "@/components/waitlist/waitlist-timer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <WaitlistProvider>
        {children}
        <WaitlistTimer />
      </WaitlistProvider>
    </ThemeProvider>
  );
}
