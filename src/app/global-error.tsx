"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          background: "#0F1B2A",
          color: "#D5DBDB",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#879596", marginBottom: "1.5rem" }}>
            An unexpected error occurred.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#FF9900",
              color: "#161E2D",
              border: "none",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
