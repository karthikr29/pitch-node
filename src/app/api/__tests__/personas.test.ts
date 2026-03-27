import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

type QueryResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
  count: number | null;
};

let queryResult: QueryResult = { data: [], error: null, count: 0 };

function createChainableMock() {
  const chain: Record<string, unknown> = {};
  chain.select = mockSelect.mockReturnValue(chain);
  chain.eq = mockEq.mockReturnValue(chain);
  chain.order = mockOrder.mockReturnValue(chain);
  chain.limit = mockLimit.mockReturnValue(chain);
  chain.then = (resolve: (value: QueryResult) => void) => resolve(queryResult);
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return createChainableMock();
    },
  }),
}));

describe("Personas API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { data: [], error: null, count: 0 };
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/personas/route");
    const request = new NextRequest("http://localhost:3000/api/personas");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("applies the hard cap and returns catalog metadata headers", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    queryResult = {
      data: [
        {
          id: "persona-1",
          name: "Alex",
          title: "VP Sales",
          description: "Friendly but firm",
          emoji: "🙂",
          persona_type: "friendly",
          accent: "",
          colors: {},
          gender: "unknown",
          is_active: true,
        },
      ],
      error: null,
      count: 125,
    };

    const { GET } = await import("@/app/api/personas/route");
    const request = new NextRequest("http://localhost:3000/api/personas");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith("personas");
    expect(mockEq).toHaveBeenCalledWith("is_active", true);
    expect(mockOrder).toHaveBeenCalledWith("name");
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(response.headers.get("X-Total-Count")).toBe("125");
    expect(response.headers.get("X-Result-Limit")).toBe("100");
    expect(response.headers.get("X-Results-Truncated")).toBe("true");
  });

  it("applies the type filter when provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    queryResult = {
      data: [
        {
          id: "persona-2",
          name: "Jordan",
          title: "CTO",
          description: "Analytical",
          emoji: "🧠",
          persona_type: "technical_gatekeeper",
          accent: "",
          colors: {},
          gender: "unknown",
          is_active: true,
        },
      ],
      error: null,
      count: 1,
    };

    const { GET } = await import("@/app/api/personas/route");
    const request = new NextRequest("http://localhost:3000/api/personas?type=technical_gatekeeper");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockEq).toHaveBeenCalledWith("persona_type", "technical_gatekeeper");
    expect(response.headers.get("X-Results-Truncated")).toBe("false");
  });

  it("returns 500 when the database query fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    queryResult = { data: null, error: { message: "Database error" }, count: null };

    const { GET } = await import("@/app/api/personas/route");
    const request = new NextRequest("http://localhost:3000/api/personas");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Database error");
  });
});
