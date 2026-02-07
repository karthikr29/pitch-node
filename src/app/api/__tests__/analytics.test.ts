import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("Analytics Overview API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Build different chains depending on the table queried
    mockSingle.mockResolvedValue({ data: null });
    mockLimit.mockResolvedValue({ data: [] });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ single: mockSingle, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/analytics/overview/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns camelCase overview with recentSessions and achievements", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockProgress = { total_sessions: 10, average_score: 75, current_streak: 5, best_score: 92 };
    const mockSessions = [
      {
        id: "s1",
        created_at: "2025-01-15",
        scenarios: { title: "Cold Call", call_type: "cold_call" },
        personas: { name: "John", emoji: "👤" },
        session_analytics: { overall_score: 80 },
      },
    ];
    const mockAchievements = [{ id: "a1", earned_at: "2025-01-15" }];

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_progress") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockProgress }),
            }),
          }),
        };
      }
      if (table === "sessions") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: mockSessions }),
              }),
            }),
          }),
        };
      }
      if (table === "user_achievements") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: mockAchievements }),
              }),
            }),
          }),
        };
      }
      return { select: mockSelect };
    });

    const { GET } = await import("@/app/api/analytics/overview/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    // Now returns camelCase top-level keys
    expect(body.totalSessions).toBe(10);
    expect(body.avgScore).toBe(75);
    expect(body.currentStreak).toBe(5);
    expect(body.bestScore).toBe(92);
    // Recent sessions are transformed
    expect(body.recentSessions).toHaveLength(1);
    expect(body.recentSessions[0].scenarioName).toBe("Cold Call");
    expect(body.achievements).toEqual(mockAchievements);
  });

  it("queries the correct tables", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const tablesQueried: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      tablesQueried.push(table);
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null }),
            order: () => ({
              limit: () => Promise.resolve({ data: [] }),
            }),
          }),
        }),
      };
    });

    const { GET } = await import("@/app/api/analytics/overview/route");
    await GET();

    expect(tablesQueried).toContain("user_progress");
    expect(tablesQueried).toContain("sessions");
    expect(tablesQueried).toContain("user_achievements");
  });
});
