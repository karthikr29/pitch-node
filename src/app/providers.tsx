"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { WaitlistTimer } from "@/components/waitlist/waitlist-timer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
      <WaitlistTimer />
    </ThemeProvider>
  );
}
