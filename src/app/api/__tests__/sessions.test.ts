import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const cleanupEq = vi.fn();
const cleanupIs = vi.fn();
const cleanupIn = vi.fn();
const cleanupLt = vi.fn();

const selectEqUser = vi.fn();
const selectEqStatus = vi.fn();
const selectOrder = vi.fn();
const selectRange = vi.fn();

type SessionsResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
  count: number | null;
};

let sessionsResult: SessionsResult = { data: [], error: null, count: 0 };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("Sessions API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionsResult = { data: [], error: null, count: 0 };

    cleanupLt.mockResolvedValue({ error: null });
    cleanupIn.mockReturnValue({ lt: cleanupLt });
    cleanupIs.mockReturnValue({ in: cleanupIn });
    cleanupEq.mockReturnValue({ is: cleanupIs });

    selectRange.mockResolvedValue(sessionsResult);
    selectOrder.mockReturnValue({ range: selectRange });
    selectEqStatus.mockReturnValue({ order: selectOrder });
    selectEqUser.mockReturnValue({ eq: selectEqStatus });

    mockFrom.mockImplementation((table: string) => {
      if (table !== "sessions") throw new Error(`Unexpected table ${table}`);
      return {
        delete: () => ({ eq: cleanupEq }),
        select: () => ({ eq: selectEqUser }),
      };
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns paginated sessions with camelCase keys", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    sessionsResult = {
      data: [
        {
          id: "s1",
          created_at: "2025-01-15",
          duration_seconds: 300,
          scenarios: { title: "Cold Call", call_type: "cold_call", difficulty: "Easy" },
          personas: { name: "John", emoji: "👤" },
          session_analytics: { overall_score: 75, scores: {} },
        },
        {
          id: "s2",
          created_at: "2025-01-16",
          duration_seconds: 450,
          scenarios: { title: "Discovery", call_type: "discovery", difficulty: "Medium" },
          personas: { name: "Jane", emoji: "👩" },
          session_analytics: { overall_score: 82, scores: {} },
        },
      ],
      error: null,
      count: 2,
    };
    selectRange.mockResolvedValue(sessionsResult);

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessions).toHaveLength(2);
    expect(body.sessions[0]).toMatchObject({
      id: "s1",
      scenarioName: "Cold Call",
      personaName: "John",
      score: 75,
      duration: 300,
      callType: "cold_call",
    });
    expect(body.totalPages).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
  });

  it("uses page and limit query params for pagination", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    selectRange.mockResolvedValue({ data: [], error: null, count: 0 });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions?page=3&limit=5");
    const response = await GET(request);
    const body = await response.json();

    expect(body.page).toBe(3);
    expect(body.limit).toBe(5);
    expect(selectRange).toHaveBeenCalledWith(10, 14);
  });

  it("filters sessions by user and completed status", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    selectRange.mockResolvedValue({ data: [], error: null, count: 0 });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    await GET(request);

    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(selectEqUser).toHaveBeenCalledWith("user_id", "user-123");
    expect(selectEqStatus).toHaveBeenCalledWith("status", "completed");
  });

  it("returns 500 when the database query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    selectRange.mockResolvedValue({ data: null, error: { message: "Query failed" }, count: null });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Query failed");
  });
});
