"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-background-secondary to-background-primary border-t border-border/50 overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl -translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-accent/5 blur-3xl translate-x-1/2 -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand column - takes more space */}
          <div className="md:col-span-5 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 transition-transform group-hover:scale-105">
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

            <p className="text-primary font-semibold text-sm tracking-wide">
              The Science of Sales Performance
            </p>

            <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
              Practice live sales conversations against AI opponents.
              Map every response. Master objections.
              Prove readiness before real deals are on the line.
            </p>

            {/* Social proof or mission */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2">
                {["🎯", "🚀", "💪"].map((emoji, i) => (
                  <motion.div
                    key={i}
                    className="w-8 h-8 rounded-full bg-surface border-2 border-background-secondary flex items-center justify-center text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {emoji}
                  </motion.div>
                ))}
              </div>
              <span className="text-xs text-text-muted">
                Trusted by ambitious sales teams
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="text-sm font-semibold text-text-primary mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "How it Works", href: "#how-it-works" },
                { label: "Features", href: "#features" },
                { label: "For Teams", href: "#personas" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-text-secondary hover:text-primary text-sm transition-colors inline-flex items-center gap-1 group"
                  >
                    <span className="w-0 h-px bg-primary transition-all group-hover:w-3" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-text-primary mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-text-secondary hover:text-primary text-sm transition-colors inline-flex items-center gap-1 group"
                  >
                    <span className="w-0 h-px bg-primary transition-all group-hover:w-3" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / CTA */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-text-primary mb-4">
              Get in Touch
            </h4>
            <div className="space-y-3">
              <a
                href="mailto:hello@pitchnode.com"
                className="text-text-secondary hover:text-primary text-sm transition-colors block"
              >
                hello@pitchnode.com
              </a>

              {/* Social icons placeholder */}
              <div className="flex items-center gap-2 pt-1">
                {[
                  { icon: "𝕏", label: "Twitter" },
                  { icon: "in", label: "LinkedIn" },
                ].map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    className="w-8 h-8 rounded-lg bg-surface/50 border border-border/50 flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all text-xs font-bold"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            © {currentYear} PitchNode. All rights reserved.
          </p>

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Made with</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ❤️
            </motion.span>
            <span>for sales teams everywhere</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
