import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
let mockQueryResult = { data: [] as unknown[], error: null as unknown };

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

  it("returns scenarios for authenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const mockScenarios = [
      { id: "1", title: "Cold Call", call_type: "cold_call" },
      { id: "2", title: "Discovery", call_type: "discovery" },
    ];
    mockQueryResult = { data: mockScenarios, error: null };

    const { GET } = await import("@/app/api/scenarios/route");
    const request = new NextRequest("http://localhost:3000/api/scenarios");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockScenarios);
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
