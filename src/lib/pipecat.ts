export function getPipecatServiceUrl(): string {
  const url = process.env.PIPECAT_SERVICE_URL;
  if (!url) {
    if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
      throw new Error(
        "PIPECAT_SERVICE_URL is required in production. Set it in your environment variables."
      );
    }
    return "http://localhost:8000";
  }
  return url;
}
