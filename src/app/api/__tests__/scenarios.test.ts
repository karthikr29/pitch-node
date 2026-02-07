import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
type MockQueryResult = { data: unknown[] | null; error: unknown };
let mockQueryResult: MockQueryResult = { data: [], error: null };

// Create a chainable mock that always resolves to mockQueryResult
function createChainableMock() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) => resolve(mockQueryResult);
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: () => createChainableMock(),
  }),
}));

describe("Scenarios API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: [], error: null };
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/scenarios/route");
    const request = new NextRequest("http://localhost:3000/api/scenarios");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns scenarios with camelCase keys for authenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const mockDbRows = [
      { id: "1", title: "Cold Call", description: "desc1", call_type: "cold_call", difficulty: "Easy" },
      { id: "2", title: "Discovery", description: "desc2", call_type: "discovery", difficulty: "Medium" },
    ];
    mockQueryResult = { data: mockDbRows, error: null };

    const { GET } = await import("@/app/api/scenarios/route");
    const request = new NextRequest("http://localhost:3000/api/scenarios");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    // API now transforms call_type → callType
    expect(body).toEqual([
      { id: "1", title: "Cold Call", description: "desc1", callType: "cold_call", difficulty: "Easy" },
      { id: "2", title: "Discovery", description: "desc2", callType: "discovery", difficulty: "Medium" },
    ]);
  });

  it("returns 500 when database query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockQueryResult = { data: null, error: { message: "Database error" } };

    const { GET } = await import("@/app/api/scenarios/route");
    const request = new NextRequest("http://localhost:3000/api/scenarios");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Database error");
  });
});
