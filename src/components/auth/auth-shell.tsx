"use client";

import Link from "next/link";
import Image from "next/image";
import { StarryBackground } from "@/components/ui";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StarryBackground />
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background-primary">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 mb-8 group"
        >
          <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
            <Image
              src="/branding/logo.svg"
              alt="pitchnode Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-display text-3xl font-bold text-text-primary tracking-[0.07em]">
            pitch<span className="text-primary">node</span>
          </span>
        </Link>

        {/* Form Card */}
        <div className="w-full max-w-md">
          {children}
        </div>

        {/* Back to home */}
        <p className="text-center mt-6 text-muted-foreground text-sm">
          <Link href="/" className="hover:text-primary transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </>
  );
}
