import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

describe("Auth Library (client-side)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("calls supabase signUp with email, password, and name metadata", async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: "1" } }, error: null });

      const { signUp } = await import("@/lib/auth");
      const result = await signUp("test@test.com", "pass123", "Test User");

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "pass123",
        options: { data: { full_name: "Test User" } },
      });
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it("returns error when signup fails", async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: "Email already in use" },
      });

      const { signUp } = await import("@/lib/auth");
      const result = await signUp("taken@test.com", "pass123");

      expect(result.error).toEqual({ message: "Email already in use" });
    });
  });

  describe("signIn", () => {
    it("calls supabase signInWithPassword with correct credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: "token" } },
        error: null,
      });

      const { signIn } = await import("@/lib/auth");
      const result = await signIn("test@test.com", "pass123");

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "pass123",
      });
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it("returns error for invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      });

      const { signIn } = await import("@/lib/auth");
      const result = await signIn("test@test.com", "wrong");

      expect(result.error).toEqual({ message: "Invalid login credentials" });
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = await import("@/lib/auth");
      const result = await signOut();

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe("getSession", () => {
    it("returns the current session", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token", user: { id: "1" } } },
        error: null,
      });

      const { getSession } = await import("@/lib/auth");
      const result = await getSession();

      expect(result.session).toBeDefined();
      expect(result.session?.access_token).toBe("token");
    });

    it("returns null session when not authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { getSession } = await import("@/lib/auth");
      const result = await getSession();

      expect(result.session).toBeNull();
    });
  });

  describe("getUser", () => {
    it("returns the current user", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1", email: "test@test.com" } },
        error: null,
      });

      const { getUser } = await import("@/lib/auth");
      const result = await getUser();

      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe("user-1");
    });
  });
});
