// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // tunnelRoute is configured in next.config.ts withSentryConfig — no need to repeat here
  tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === "production" ? 0.1 : 1.0,
  enabled: process.env.NEXT_PUBLIC_APP_ENV !== "development",
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  enableLogs: true,
  sendDefaultPii: false,
  ignoreErrors: ["ResizeObserver loop limit exceeded"],
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
