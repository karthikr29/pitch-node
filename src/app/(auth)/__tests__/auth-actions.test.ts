import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    // Simulate Next.js redirect which throws
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("Auth Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("calls signInWithPassword with correct email and password", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { signIn } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "password123");

      try {
        await signIn(formData);
      } catch {
        // redirect throws
      }

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });

    it("redirects to dashboard on successful sign in", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { signIn } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "password123");

      try {
        await signIn(formData);
      } catch {
        // redirect throws
      }

      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns error message on sign in failure", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });

      const { signIn } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrongpassword");

      const result = await signIn(formData);

      expect(result).toEqual({ error: "Invalid login credentials" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    it("calls signUp with correct data and metadata", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { signUp } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("name", "John Doe");
      formData.set("email", "john@example.com");
      formData.set("password", "password123");

      try {
        await signUp(formData);
      } catch {
        // redirect throws
      }

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "password123",
        options: {
          data: { full_name: "John Doe" },
        },
      });
    });

    it("redirects to dashboard on successful sign up", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { signUp } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("name", "John Doe");
      formData.set("email", "john@example.com");
      formData.set("password", "password123");

      try {
        await signUp(formData);
      } catch {
        // redirect throws
      }

      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns error message on sign up failure", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "User already registered" },
      });

      const { signUp } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("name", "John Doe");
      formData.set("email", "john@example.com");
      formData.set("password", "password123");

      const result = await signUp(formData);

      expect(result).toEqual({ error: "User already registered" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut and redirects to login", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { signOut } = await import("@/app/(auth)/actions");

      try {
        await signOut();
      } catch {
        // redirect throws
      }

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });
});
