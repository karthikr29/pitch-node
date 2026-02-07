import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockRange = vi.fn();
const mockOrderFn = vi.fn();
const mockEqFn = vi.fn();
const mockSelectFn = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

describe("Sessions API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Build the chain: from().select().eq().order().range()
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
    mockOrderFn.mockReturnValue({ range: mockRange });
    mockEqFn.mockReturnValue({ order: mockOrderFn, eq: mockEqFn });
    mockSelectFn.mockReturnValue({ eq: mockEqFn });
    mockFrom.mockReturnValue({ select: mockSelectFn });
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
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    // Mock DB rows with nested joins
    const mockDbRows = [
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
    ];
    mockRange.mockResolvedValue({ data: mockDbRows, error: null, count: 2 });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    // New format: { sessions, totalPages, page, limit }
    expect(body.sessions).toHaveLength(2);
    expect(body.sessions[0].id).toBe("s1");
    expect(body.sessions[0].scenarioName).toBe("Cold Call");
    expect(body.sessions[0].callType).toBe("cold_call");
    expect(body.sessions[0].score).toBe(75);
    expect(body.sessions[0].duration).toBe(300);
    expect(body.totalPages).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
  });

  it("uses page and limit query params for pagination", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions?page=3&limit=5");
    const response = await GET(request);
    const body = await response.json();

    expect(body.page).toBe(3);
    expect(body.limit).toBe(5);
    // offset = (3-1)*5 = 10, range(10, 14)
    expect(mockRange).toHaveBeenCalledWith(10, 14);
  });

  it("queries sessions filtered by user_id", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    await GET(request);

    expect(mockFrom).toHaveBeenCalledWith("sessions");
    expect(mockEqFn).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("returns 500 when database query fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockRange.mockResolvedValue({ data: null, error: { message: "Query failed" }, count: null });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Query failed");
  });
});
