import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import SessionReviewPage from "@/app/(dashboard)/history/[sessionId]/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ sessionId: "session-1" }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function buildApiResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    createdAt: "2026-02-22T12:00:00.000Z",
    startedAt: "2026-02-22T12:00:00.000Z",
    durationSeconds: 300,
    scenario: { title: "Discovery Call", callType: "discovery" },
    persona: { name: "AI Prospect" },
    transcripts: [],
    analytics: {
      overallScore: 84,
      metrics: {
        activeListening: 80,
        objectionHandling: 82,
        closing: 84,
        rapport: 86,
      },
      highlightMoments: [],
      improvementSuggestions: [],
    },
    recording: {
      status: "none",
      url: null,
      durationSeconds: null,
      expiresAt: null,
      error: null,
    },
    ...overrides,
  };
}

describe("SessionReviewPage recording states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders inline audio player when recording is ready", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        buildApiResponse({
          recording: {
            status: "ready",
            url: "https://signed.example/audio.mp3",
            durationSeconds: 123,
            expiresAt: "2099-01-01T00:00:00.000Z",
            error: null,
          },
        }),
    });

    const { container } = render(<SessionReviewPage />);
    await waitFor(() => {
      expect(container.querySelector("audio")).toBeInTheDocument();
    });
  });

  it("shows processing state while recording is being prepared", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        buildApiResponse({
          recording: {
            status: "processing",
            url: null,
            durationSeconds: null,
            expiresAt: null,
            error: null,
          },
        }),
    });

    render(<SessionReviewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Recording is processing/i)).toBeInTheDocument();
    });
  });

  it("shows failed state", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        buildApiResponse({
          recording: {
            status: "failed",
            url: null,
            durationSeconds: null,
            expiresAt: null,
            error: "Failed to prepare recording.",
          },
        }),
    });

    render(<SessionReviewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to prepare recording/i)).toBeInTheDocument();
    });
  });

  it("shows expired state", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        buildApiResponse({
          recording: {
            status: "expired",
            url: null,
            durationSeconds: 120,
            expiresAt: "2026-01-01T00:00:00.000Z",
            error: null,
          },
        }),
    });

    render(<SessionReviewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Recording expired/i)).toBeInTheDocument();
    });
  });

  it("polls until recording reaches terminal state", async () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval").mockImplementation((handler: TimerHandler) => {
      if (typeof handler === "function") {
        handler();
      }
      return 1 as unknown as ReturnType<typeof setInterval>;
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildApiResponse({
            analytics: null,
            recording: {
              status: "processing",
              url: null,
              durationSeconds: null,
              expiresAt: null,
              error: null,
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildApiResponse({
            recording: {
              status: "ready",
              url: "https://signed.example/audio.mp3",
              durationSeconds: 95,
              expiresAt: "2099-01-01T00:00:00.000Z",
              error: null,
            },
          }),
      });

    const { container } = render(<SessionReviewPage />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(container.querySelector("audio")).toBeInTheDocument();
    });

    setIntervalSpy.mockRestore();
  });
});
