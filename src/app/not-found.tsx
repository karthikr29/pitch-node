import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-display font-extrabold text-primary mb-4">
          404
        </h1>
        <h2 className="text-2xl font-display font-bold text-text-primary mb-4">
          Page not found
        </h2>
        <p className="text-text-secondary mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-text-on-primary hover:bg-primary-hover transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
