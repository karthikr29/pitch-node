import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock the top-level middleware that delegates to updateSession
vi.mock("@/lib/supabase/middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/middleware")>();
  return actual;
});

describe("Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("exports a config with the correct matcher", async () => {
    const { config } = await import("@/middleware");
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain("_next/static");
    expect(unstable_doesMiddlewareMatch({
      config,
      url: "http://localhost:3000/api/health",
    })).toBe(false);
    expect(unstable_doesMiddlewareMatch({
      config,
      url: "http://localhost:3000/api/personas",
    })).toBe(true);
  });
});

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("redirects unauthenticated users from dashboard to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated users from nested dashboard routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard/practice");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows unauthenticated users on public routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/");
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it("redirects authenticated users from login to dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/login");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects authenticated users from signup to dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/signup");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects authenticated users from forgot-password to dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/forgot-password");
    const response = await updateSession(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("allows authenticated users on dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it("allows unauthenticated users on auth reset-password", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/auth/reset-password");
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });

  it("allows authenticated users on auth reset-password", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/auth/reset-password");
    const response = await updateSession(request);
    expect(response.status).toBe(200);
  });
});
