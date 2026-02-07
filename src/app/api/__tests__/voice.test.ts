import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelectSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

// Mock fetch for pipecat service calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("Voice API - create-room", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.PIPECAT_SERVICE_URL = "http://localhost:8000";
    process.env.PIPECAT_SERVICE_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_LIVEKIT_URL = "wss://livekit.test";

    // Default chain for insert: from().insert().select().single()
    mockSelectSingle.mockResolvedValue({
      data: { id: "session-1", livekit_room_name: "room-1" },
      error: null,
    });
    mockInsert.mockReturnValue({ select: () => ({ single: () => mockSelectSingle() }) });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return { eq: mockEq };
      },
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({ scenarioId: "s1", personaId: "p1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when scenarioId is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({ personaId: "p1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("scenarioId");
  });

  it("returns 400 when personaId is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({ scenarioId: "s1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("personaId");
  });

  it("creates a session and calls pipecat service on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "lk-token-123" }),
    });

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({ scenarioId: "s1", personaId: "p1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessionId).toBe("session-1");
    expect(body.token).toBe("lk-token-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/sessions/start",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Authorization": "Bearer test-key",
        }),
      })
    );
  });

  it("returns 502 when pipecat service returns error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({ scenarioId: "s1", personaId: "p1" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(502);
  });

  it("returns 503 when pipecat service is unavailable", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({ scenarioId: "s1", personaId: "p1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("unavailable");
  });
});

describe("Voice API - end-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.PIPECAT_SERVICE_URL = "http://localhost:8000";
    process.env.PIPECAT_SERVICE_API_KEY = "test-key";
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/voice/end-session/route");
    const request = new NextRequest("http://localhost:3000/api/voice/end-session", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when sessionId is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/voice/end-session/route");
    const request = new NextRequest("http://localhost:3000/api/voice/end-session", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("sessionId");
  });

  it("returns 404 when session not found or not owned by user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // Chain: from().select().eq().eq().single()
    const mockSingle = vi.fn().mockResolvedValue({ data: null });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSel = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSel });

    const { POST } = await import("@/app/api/voice/end-session/route");
    const request = new NextRequest("http://localhost:3000/api/voice/end-session", {
      method: "POST",
      body: JSON.stringify({ sessionId: "nonexistent" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("ends session and returns duration", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const startedAt = new Date(Date.now() - 300000).toISOString(); // 5 min ago
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "s1", user_id: "user-1", started_at: startedAt, livekit_room_name: "room-1" },
    });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSel = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    mockFrom.mockReturnValue({ select: mockSel, update: mockUpdateFn });

    mockFetch.mockResolvedValue({ ok: true });

    const { POST } = await import("@/app/api/voice/end-session/route");
    const request = new NextRequest("http://localhost:3000/api/voice/end-session", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessionId).toBe("s1");
    expect(body.duration).toBeGreaterThan(0);
  });
});
