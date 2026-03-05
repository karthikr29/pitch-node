import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  }),
}));

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    created_at: "2026-02-22T12:00:00.000Z",
    started_at: "2026-02-22T12:00:00.000Z",
    ended_at: "2026-02-22T12:05:00.000Z",
    duration_seconds: 300,
    status: "completed",
    livekit_room_name: "room-1",
    pitch_briefing: null,
    scenarios: null,
    personas: null,
    session_analytics: null,
    session_transcripts: [],
    session_recordings: null,
    ...overrides,
  };
}

describe("Session Detail API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example/audio.mp3" },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => mockSingle(),
          }),
        }),
      }),
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const request = new NextRequest("http://localhost:3000/api/sessions/session-1");
    const response = await GET(request, { params: Promise.resolve({ id: "session-1" }) });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns recording.ready with signed url", async () => {
    mockSingle.mockResolvedValue({
      data: buildRow({
        session_recordings: {
          status: "ready",
          storage_bucket: "session-recordings",
          storage_path: "user-1/session-1/recording.mp3",
          duration_seconds: 123,
          expires_at: "2099-01-01T00:00:00.000Z",
          error_message: null,
        },
      }),
      error: null,
    });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const request = new NextRequest("http://localhost:3000/api/sessions/session-1");
    const response = await GET(request, { params: Promise.resolve({ id: "session-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recording.status).toBe("ready");
    expect(body.recording.url).toContain("https://signed.example");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-1/session-1/recording.mp3", 600);
  });

  it("returns recording.processing while recording is in progress", async () => {
    mockSingle.mockResolvedValue({
      data: buildRow({
        session_recordings: {
          status: "recording",
          storage_bucket: "session-recordings",
          storage_path: "user-1/session-1/recording.mp3",
        },
      }),
      error: null,
    });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const request = new NextRequest("http://localhost:3000/api/sessions/session-1");
    const response = await GET(request, { params: Promise.resolve({ id: "session-1" }) });
    const body = await response.json();

    expect(body.recording.status).toBe("processing");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns recording.expired when ready recording has expired", async () => {
    mockSingle.mockResolvedValue({
      data: buildRow({
        session_recordings: {
          status: "ready",
          storage_bucket: "session-recordings",
          storage_path: "user-1/session-1/recording.mp3",
          expires_at: "2020-01-01T00:00:00.000Z",
        },
      }),
      error: null,
    });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const request = new NextRequest("http://localhost:3000/api/sessions/session-1");
    const response = await GET(request, { params: Promise.resolve({ id: "session-1" }) });
    const body = await response.json();

    expect(body.recording.status).toBe("expired");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns recording.none for legacy sessions", async () => {
    mockSingle.mockResolvedValue({
      data: buildRow({ session_recordings: null }),
      error: null,
    });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const request = new NextRequest("http://localhost:3000/api/sessions/session-1");
    const response = await GET(request, { params: Promise.resolve({ id: "session-1" }) });
    const body = await response.json();

    expect(body.recording.status).toBe("none");
    expect(body.recording.url).toBeNull();
  });

  it("returns recording.failed with provider error", async () => {
    mockSingle.mockResolvedValue({
      data: buildRow({
        session_recordings: {
          status: "failed",
          storage_bucket: "session-recordings",
          storage_path: "user-1/session-1/recording.mp3",
          error_message: "Encoding failed",
        },
      }),
      error: null,
    });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const request = new NextRequest("http://localhost:3000/api/sessions/session-1");
    const response = await GET(request, { params: Promise.resolve({ id: "session-1" }) });
    const body = await response.json();

    expect(body.recording.status).toBe("failed");
    expect(body.recording.error).toContain("Encoding failed");
  });

  it("maps signed-url failures to recording.failed", async () => {
    mockSingle.mockResolvedValue({
      data: buildRow({
        session_recordings: {
          status: "ready",
          storage_bucket: "session-recordings",
          storage_path: "user-1/session-1/recording.mp3",
          expires_at: "2099-01-01T00:00:00.000Z",
        },
      }),
      error: null,
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "forbidden" },
    });

    const { GET } = await import("@/app/api/sessions/[id]/route");
    const request = new NextRequest("http://localhost:3000/api/sessions/session-1");
    const response = await GET(request, { params: Promise.resolve({ id: "session-1" }) });
    const body = await response.json();

    expect(body.recording.status).toBe("failed");
    expect(body.recording.error).toContain("forbidden");
  });
});
