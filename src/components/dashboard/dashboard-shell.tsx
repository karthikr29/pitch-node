"use client";

import { NavBar } from "@/components/dashboard/nav-bar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">{children}</main>
    </div>
  );
}
