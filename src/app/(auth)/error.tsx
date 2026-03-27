"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AuthError({
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
    <Card className="p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6 text-error" />
      </div>
      <h2 className="text-lg font-display font-bold text-card-foreground mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset} className="w-full">
        Try again
      </Button>
    </Card>
  );
}
