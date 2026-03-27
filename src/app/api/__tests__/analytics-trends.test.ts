import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

function createSessionRow(index: number) {
  const createdAt = new Date("2026-03-27T12:00:00.000Z");
  createdAt.setUTCDate(createdAt.getUTCDate() - Math.floor(index / 5));

  return {
    id: `session-${index}`,
    created_at: createdAt.toISOString(),
    scenarios: {
      title: `Scenario ${index}`,
      call_type: index % 2 === 0 ? "pitch" : "discovery",
    },
    session_analytics: {
      overall_score: 60 + (index % 20),
      scores: {
        objection_handling: 50 + (index % 10),
      },
      letter_grade: index % 2 === 0 ? "A-" : "B+",
    },
  };
}

describe("Analytics Trends API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T12:00:00.000Z"));

    mockRange.mockReset();
    const chain: Record<string, unknown> = {};
    chain.select = mockSelect.mockReturnValue(chain);
    chain.eq = mockEq.mockReturnValue(chain);
    chain.gte = mockGte.mockReturnValue(chain);
    chain.order = mockOrder.mockReturnValue(chain);
    chain.range = mockRange;

    mockFrom.mockReturnValue(chain);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/analytics/trends/route");
    const request = new NextRequest("http://localhost:3000/api/analytics/trends");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("aggregates multiple bounded batches and clamps oversized day ranges", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const sessions = Array.from({ length: 503 }, (_, index) => createSessionRow(index));
    mockRange
      .mockResolvedValueOnce({ data: sessions.slice(0, 500), error: null })
      .mockResolvedValueOnce({ data: sessions.slice(500), error: null });

    const { GET } = await import("@/app/api/analytics/trends/route");
    const request = new NextRequest("http://localhost:3000/api/analytics/trends?days=9999");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockRange).toHaveBeenNthCalledWith(1, 0, 499);
    expect(mockRange).toHaveBeenNthCalledWith(2, 500, 999);
    expect(body.trends).toHaveLength(503);
    expect(body.activity).toHaveLength(365);
    expect(body.metrics).toEqual([{ metric: "Objection Handling", value: 54 }]);
    expect(body.recentSessions).toHaveLength(6);
    expect(body.recentSessions[0].id).toBe("session-502");
    expect(body.recentSessions[5].id).toBe("session-497");
    expect(body.gradeDistribution).toEqual([
      { grade: "A", count: 252 },
      { grade: "B", count: 251 },
      { grade: "C", count: 0 },
      { grade: "D", count: 0 },
      { grade: "F", count: 0 },
    ]);
  });

  it("clamps too-small day ranges to a single day", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockRange.mockResolvedValueOnce({ data: [createSessionRow(0)], error: null });

    const { GET } = await import("@/app/api/analytics/trends/route");
    const request = new NextRequest("http://localhost:3000/api/analytics/trends?days=0");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activity).toHaveLength(1);
  });

  it("returns 500 if a later batch fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockRange
      .mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, index) => createSessionRow(index)), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Range failed" } });

    const { GET } = await import("@/app/api/analytics/trends/route");
    const request = new NextRequest("http://localhost:3000/api/analytics/trends");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Range failed");
  });
});
