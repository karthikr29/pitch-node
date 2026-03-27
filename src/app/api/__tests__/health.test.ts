import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();
const mockCreateAdminClient = vi.fn();
const mockWarn = vi.fn();
const mockCaptureException = vi.fn();
const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}));

vi.mock("@sentry/nextjs", () => ({
  logger: {
    warn: (...args: unknown[]) => mockWarn(...args),
  },
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

describe("Health API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.PIPECAT_SERVICE_URL = "http://localhost:8000";

    mockLimit.mockResolvedValue({ error: null });
    mockSelect.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockCreateAdminClient.mockReturnValue({ from: mockFrom });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });
  });

  it("returns 200 when database and voice checks succeed", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(body.voice).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    expect(response.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    expect(mockCreateAdminClient).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("scenarios");
    expect(mockSelect).toHaveBeenCalledWith("id");
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/health",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("returns 503 with db error when the admin client is misconfigured", async () => {
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("error");
    expect(body.voice).toBe("ok");
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("returns 503 with db error when the database query fails", async () => {
    mockLimit.mockResolvedValue({ error: { message: "Database unavailable" } });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("error");
    expect(body.voice).toBe("ok");
    expect(mockWarn).toHaveBeenCalledTimes(1);
  });

  it("returns 503 with voice error when PIPECAT_SERVICE_URL is missing", async () => {
    delete process.env.PIPECAT_SERVICE_URL;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("ok");
    expect(body.voice).toBe("error");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledTimes(1);
  });

  it("returns 503 with voice error when the voice service returns a non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ status: "error" }),
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("ok");
    expect(body.voice).toBe("error");
    expect(mockWarn).toHaveBeenCalledTimes(1);
  });

  it("returns 503 with voice error when the voice service returns unexpected JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "degraded" }),
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("ok");
    expect(body.voice).toBe("error");
    expect(mockWarn).toHaveBeenCalledTimes(1);
  });

  it("returns 503 with voice error when the voice service fetch rejects", async () => {
    mockFetch.mockRejectedValue(new Error("timeout"));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("ok");
    expect(body.voice).toBe("error");
    expect(mockWarn).toHaveBeenCalledTimes(1);
  });
});
