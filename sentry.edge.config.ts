// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Lower sample rate for edge — runs on every middleware request
  tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === "production" ? 0.05 : 1.0,
  enabled: process.env.NEXT_PUBLIC_APP_ENV !== "development",
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  enableLogs: true,
  sendDefaultPii: false,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});
