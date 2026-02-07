import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateBrowserClient = vi.fn().mockReturnValue({
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
});

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe("Supabase Browser Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("creates a supabase client with correct config", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    );
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it("returns an object with auth methods", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();

    expect(client.auth.getUser).toBeDefined();
    expect(client.auth.getSession).toBeDefined();
    expect(client.auth.signInWithPassword).toBeDefined();
    expect(client.auth.signUp).toBeDefined();
    expect(client.auth.signOut).toBeDefined();
  });

  it("returns an object with database query method", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();

    expect(typeof client.from).toBe("function");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();

    const { createClient } = await import("@/lib/supabase/client");
    expect(() => createClient()).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.resetModules();

    const { createClient } = await import("@/lib/supabase/client");
    expect(() => createClient()).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  });
});
