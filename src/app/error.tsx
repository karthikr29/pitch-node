"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7 text-error" />
        </div>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-3">
          Something went wrong
        </h1>
        <p className="text-text-secondary mb-8">
          An unexpected error occurred. If the problem continues, try refreshing the page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-text-primary hover:bg-background-secondary transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
