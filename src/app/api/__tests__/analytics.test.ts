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

  it("returns progress, recentSessions, and achievements for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockProgress = { total_sessions: 10, current_streak: 5 };
    const mockSessions = [{ id: "s1" }, { id: "s2" }];
    const mockAchievements = [{ id: "a1", earned_at: "2025-01-15" }];

    // We need to handle three different from() calls
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
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
    expect(body.progress).toEqual(mockProgress);
    expect(body.recentSessions).toEqual(mockSessions);
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
