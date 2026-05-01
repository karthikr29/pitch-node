import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelectSingle = vi.fn();
const mockScenarioSingle = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();
const mockGetOrCreateFreeLifetimeCredits = vi.fn();
const mockGetOrCreatePerformerMonthlyCredits = vi.fn();
const mockCompleteSessionWithCredits = vi.fn();

// Mock fetch for pipecat service calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/credits", () => ({
  getOrCreateFreeLifetimeCredits: (...args: unknown[]) => mockGetOrCreateFreeLifetimeCredits(...args),
  getOrCreatePerformerMonthlyCredits: (...args: unknown[]) => mockGetOrCreatePerformerMonthlyCredits(...args),
  completeSessionWithCredits: (...args: unknown[]) => mockCompleteSessionWithCredits(...args),
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
    mockScenarioSingle.mockResolvedValue({
      data: { id: "s1", call_type: "discovery" },
      error: null,
    });
    mockInsert.mockReturnValue({ select: () => ({ single: () => mockSelectSingle() }) });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: null, error: null });
    mockGetOrCreateFreeLifetimeCredits.mockResolvedValue({
      creditsLimit: 600,
      creditsUsed: 0,
      creditsRemaining: 600,
      creditsScope: "lifetime",
      periodEnd: null,
    });
    mockGetOrCreatePerformerMonthlyCredits.mockResolvedValue({
      creditsLimit: 30000,
      creditsUsed: 0,
      creditsRemaining: 30000,
      creditsScope: "monthly",
      periodEnd: "2026-06-01T00:00:00.000Z",
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "sessions") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: mockInsert,
          delete: () => mockDelete(),
        };
      }

      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { plan_type: "free" },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "scenarios") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockScenarioSingle(),
            }),
          }),
        };
      }

      return {
        insert: mockInsert,
        update: (...args: unknown[]) => {
          mockUpdate(...args);
          return { eq: mockEq };
        },
        delete: () => mockDelete(),
      };
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
    expect(mockUpdate).not.toHaveBeenCalled();
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

  it("returns 400 for pitch scenario when pitchBriefing is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockScenarioSingle.mockResolvedValue({
      data: { id: "pitch-scenario-1", call_type: "pitch" },
      error: null,
    });

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({ scenarioId: "pitch-scenario-1", personaId: "p1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("pitchBriefing");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("accepts valid pitchBriefing and forwards pitch_briefing to pipecat", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockScenarioSingle.mockResolvedValue({
      data: { id: "pitch-scenario-1", call_type: "pitch" },
      error: null,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "lk-token-123" }),
    });

    const { POST } = await import("@/app/api/voice/create-room/route");
    const request = new NextRequest("http://localhost:3000/api/voice/create-room", {
      method: "POST",
      body: JSON.stringify({
        scenarioId: "pitch-scenario-1",
        personaId: "p1",
        pitchBriefing: {
          whatYouSell: "AI outbound assistant",
          targetAudience: "B2B SaaS sales leaders",
          problemSolved: "Low conversion from outbound sequences",
          valueProposition: "More qualified meetings with less manual effort",
          callGoal: "Secure agreement for a pilot",
          additionalNotes: "Competing against in-house workflow",
        },
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const forwardedPayload = JSON.parse(
      (mockFetch.mock.calls[0][1] as { body: string }).body
    ) as Record<string, unknown>;
    expect(forwardedPayload.pitch_briefing).toMatchObject({
      whatYouSell: "AI outbound assistant",
      callGoal: "Secure agreement for a pilot",
    });
    expect(typeof forwardedPayload.pitch_context).toBe("string");
    expect((forwardedPayload.pitch_context as string).length).toBeGreaterThan(0);
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
    mockCompleteSessionWithCredits.mockResolvedValue({
      sessionId: "s1",
      durationSeconds: 300,
      creditsChargedSeconds: 300,
      creditsUsedSeconds: 300,
      creditsRemaining: 300,
      alreadyCharged: false,
    });
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
      data: { id: "s1", user_id: "user-1", started_at: startedAt, status: "active", livekit_room_name: "room-1" },
    });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSel = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSel });

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
    expect(body.duration).toBe(300);
    expect(body.creditsCharged).toBe(300);
    expect(mockCompleteSessionWithCredits).toHaveBeenCalledWith(
      expect.anything(),
      "s1",
      expect.any(String)
    );
  });

  it("completes with the shared credit RPC when the session has not started yet", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockCompleteSessionWithCredits.mockResolvedValue({
      sessionId: "s1",
      durationSeconds: 0,
      creditsChargedSeconds: 0,
      creditsUsedSeconds: 0,
      creditsRemaining: 600,
      alreadyCharged: false,
    });
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "s1", user_id: "user-1", started_at: null, status: "active", livekit_room_name: "room-1" },
    });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSel = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSel });

    mockFetch.mockResolvedValue({ ok: true });

    const { POST } = await import("@/app/api/voice/end-session/route");
    const request = new NextRequest("http://localhost:3000/api/voice/end-session", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s1" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.duration).toBe(0);
    expect(body.creditsCharged).toBe(0);
  });
});

describe("Voice API - session-connected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/voice/session-connected/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-connected", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s1", connectedAt: new Date().toISOString() }),
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

    const { POST } = await import("@/app/api/voice/session-connected/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-connected", {
      method: "POST",
      body: JSON.stringify({ connectedAt: "not-a-date" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("sessionId");
  });

  it("returns 404 when the session is not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSelect, update: vi.fn() });

    const { POST } = await import("@/app/api/voice/session-connected/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-connected", {
      method: "POST",
      body: JSON.stringify({ sessionId: "missing", connectedAt: new Date().toISOString() }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("sets started_at and marks the session active on first connect", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const connectedAt = "2026-03-12T10:00:00.000Z";
    const mockSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: "s1", started_at: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { started_at: connectedAt },
        error: null,
      });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockIs = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdateEq2 = vi.fn().mockReturnValue({ is: mockIs });
    const mockUpdateEq1 = vi.fn().mockReturnValue({ eq: mockUpdateEq2 });
    const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockUpdateEq1 });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdateFn });

    const { POST } = await import("@/app/api/voice/session-connected/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-connected", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s1", connectedAt }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sessionId: "s1",
      startedAt: connectedAt,
      alreadyStarted: false,
    });
    expect(mockUpdateFn).toHaveBeenCalledWith({
      status: "active",
      started_at: expect.any(String),
    });
    expect(mockIs).toHaveBeenCalledWith("started_at", null);
  });

  it("returns the existing started_at without updating when already started", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const existingStartedAt = "2026-03-12T10:00:00.000Z";
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "s1", started_at: existingStartedAt },
      error: null,
    });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockUpdateFn = vi.fn();
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdateFn });

    const { POST } = await import("@/app/api/voice/session-connected/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-connected", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s1", connectedAt: new Date().toISOString() }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sessionId: "s1",
      startedAt: existingStartedAt,
      alreadyStarted: true,
    });
    expect(mockUpdateFn).not.toHaveBeenCalled();
  });
});

describe("Voice API - session-state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.PIPECAT_SERVICE_URL = "http://localhost:8000";
    process.env.PIPECAT_SERVICE_API_KEY = "test-key";
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/voice/session-state/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-state?sessionId=s1");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when sessionId is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { GET } = await import("@/app/api/voice/session-state/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-state");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("sessionId");
  });

  it("returns 404 when session is not owned by user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({ data: null });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSel = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSel });

    const { GET } = await import("@/app/api/voice/session-state/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-state?sessionId=missing");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain("Session not found");
  });

  it("returns the proxied session state payload", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "s1" } });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSel = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSel });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          sessionId: "s1",
          phase: "ending",
          autoEndRequested: true,
          endReason: {
            speaker: "user",
            reasonCode: "closing_goodbye",
            trigger: "transcription_frame",
          },
          requestedAt: "2026-03-09T00:00:00Z",
        }),
    });

    const { GET } = await import("@/app/api/voice/session-state/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-state?sessionId=s1");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.phase).toBe("ending");
    expect(body.autoEndRequested).toBe(true);
  });

  it("returns 503 when session state proxy is unavailable", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "s1" } });
    const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSel = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ select: mockSel });

    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const { GET } = await import("@/app/api/voice/session-state/route");
    const request = new NextRequest("http://localhost:3000/api/voice/session-state?sessionId=s1");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("unavailable");
  });
});
