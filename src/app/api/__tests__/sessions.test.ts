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

  it("returns paginated sessions for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const mockSessions = [
      { id: "s1", status: "completed", duration_seconds: 300 },
      { id: "s2", status: "completed", duration_seconds: 450 },
    ];
    mockRange.mockResolvedValue({ data: mockSessions, error: null, count: 2 });

    const { GET } = await import("@/app/api/sessions/route");
    const request = new NextRequest("http://localhost:3000/api/sessions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(mockSessions);
    expect(body.total).toBe(2);
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
