export type AppEnvironment = "production" | "preview" | "development";

function normalizeEnvironment(value?: string): AppEnvironment {
  const normalized = value?.toLowerCase().trim();

  if (normalized === "production" || normalized === "preview" || normalized === "development") {
    return normalized;
  }

  if (normalized === "prod") {
    return "production";
  }

  if (normalized === "dev") {
    return "development";
  }

  return "development";
}

export function getAppEnvironment(): AppEnvironment {
  if (process.env.NEXT_PUBLIC_APP_ENV) {
    return normalizeEnvironment(process.env.NEXT_PUBLIC_APP_ENV);
  }

  if (process.env.VERCEL_ENV) {
    return normalizeEnvironment(process.env.VERCEL_ENV);
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

export function isPreviewEnvironment(): boolean {
  return getAppEnvironment() === "preview";
}
