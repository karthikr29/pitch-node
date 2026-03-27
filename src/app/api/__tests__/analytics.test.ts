import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

type SessionRow = {
  id: string;
  created_at: string;
  scenarios?: { title: string; call_type: string } | null;
  personas?: { name: string; emoji: string } | null;
  session_analytics?: { overall_score?: number } | { overall_score?: number }[] | null;
};

let sessionDataResult: { data: SessionRow[] | null } = { data: [] };
let recentSessionsResult: { data: SessionRow[] | null } = { data: [] };
let achievementsResult: { data: Record<string, unknown>[] | null } = { data: [] };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("Analytics Overview API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-27T12:00:00.000Z"));
    sessionDataResult = { data: [] };
    recentSessionsResult = { data: [] };
    achievementsResult = { data: [] };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/analytics/overview/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns computed overview data and recent sessions", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    sessionDataResult = {
      data: [
        {
          id: "s1",
          created_at: "2026-03-27T08:00:00.000Z",
          session_analytics: { overall_score: 80 },
        },
        {
          id: "s2",
          created_at: "2026-03-26T08:00:00.000Z",
          session_analytics: [{ overall_score: 90 }],
        },
        {
          id: "s3",
          created_at: "2026-03-26T09:00:00.000Z",
          session_analytics: { overall_score: 0 },
        },
      ],
    };
    recentSessionsResult = {
      data: [
        {
          id: "s1",
          created_at: "2026-03-27T08:00:00.000Z",
          scenarios: { title: "Cold Call", call_type: "cold_call" },
          personas: { name: "Jordan", emoji: "🙂" },
          session_analytics: { overall_score: 80 },
        },
      ],
    };
    achievementsResult = {
      data: [{ id: "achievement-1", earned_at: "2026-03-27T09:00:00.000Z" }],
    };

    mockFrom
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(sessionDataResult),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(recentSessionsResult),
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(achievementsResult),
            }),
          }),
        }),
      }));

    const { GET } = await import("@/app/api/analytics/overview/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalSessions).toBe(3);
    expect(body.avgScore).toBe(85);
    expect(body.bestScore).toBe(90);
    expect(body.currentStreak).toBe(2);
    expect(body.recentSessions).toEqual([
      {
        id: "s1",
        date: "2026-03-27T08:00:00.000Z",
        scenarioName: "Cold Call",
        callType: "cold_call",
        score: 80,
      },
    ]);
    expect(body.achievements).toEqual(achievementsResult.data);
    expect(mockFrom).toHaveBeenNthCalledWith(1, "sessions");
    expect(mockFrom).toHaveBeenNthCalledWith(2, "sessions");
    expect(mockFrom).toHaveBeenNthCalledWith(3, "user_achievements");
  });
});
