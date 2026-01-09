"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background-secondary border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-8">
          {/* Left side - Logo, tagline, mission, and copyright */}
          <div className="flex flex-col gap-3 max-w-md">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/branding/logo.svg"
                  alt="PitchNode Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="font-display text-xl font-bold text-text-primary">
                PitchNode
              </span>
            </Link>
            
            <p className="text-text-secondary text-sm font-medium">
              The Science of Sales Performance
            </p>

            <p className="text-text-muted text-sm leading-relaxed">
              Practice live sales conversations against AI opponents.
              <br />
              Map every response. Master objections.
              <br />
              Prove readiness before real deals.
            </p>
            
            <p className="text-text-muted text-xs mt-4">
              © {currentYear} PitchNode. All rights reserved.
            </p>
          </div>

          {/* Right side - Links stacked vertically */}
          <div className="flex flex-col items-start sm:items-end gap-2 text-sm">
            <a
              href="#"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
