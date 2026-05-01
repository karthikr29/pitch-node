import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetUser = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn();
const mockCaptureException = vi.fn();
const mockSyncUserProfileFromAuth = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

vi.mock("@/lib/auth/profile-sync", () => ({
  syncUserProfileFromAuth: (...args: unknown[]) => mockSyncUserProfileFromAuth(...args),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
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
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.convosparr.com";
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSyncUserProfileFromAuth.mockResolvedValue(undefined);
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

  describe("resetPassword", () => {
    it("validates email before calling Supabase", async () => {
      const { resetPassword } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("email", "bad-email");

      const result = await resetPassword(formData);

      expect(result).toEqual({ error: "Please enter a valid email address" });
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("calls resetPasswordForEmail with the expected redirect URL", async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const { resetPassword } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(formData);

      expect(result).toEqual({
        success: "If an account exists for that email, check your inbox for a reset link.",
      });
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        { redirectTo: "https://staging.convosparr.com/auth/reset-password" }
      );
    });

    it("returns a friendly message when reset emails are rate limited", async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: { status: 429, message: "Too many requests" },
      });

      const { resetPassword } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(formData);

      expect(result).toEqual({
        error: "Too many reset attempts. Please wait a moment and try again.",
      });
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe("updatePassword", () => {
    it("validates password length and confirmation", async () => {
      const { updatePassword } = await import("@/app/(auth)/actions");
      const shortPassword = new FormData();
      shortPassword.set("password", "123");
      shortPassword.set("confirmPassword", "123");

      expect(await updatePassword(shortPassword)).toEqual({
        error: "Password must be at least 6 characters",
      });

      const mismatch = new FormData();
      mismatch.set("password", "password123");
      mismatch.set("confirmPassword", "password321");

      expect(await updatePassword(mismatch)).toEqual({
        error: "Passwords do not match",
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("returns an invalid-link error when no recovery session exists", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { updatePassword } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("password", "password123");
      formData.set("confirmPassword", "password123");

      const result = await updatePassword(formData);

      expect(result).toEqual({
        error: "This reset link is invalid or has expired. Request a new one.",
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("updates the password, signs out globally, and redirects to login", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockUpdateUser.mockResolvedValue({ error: null });
      mockSignOut.mockResolvedValue({ error: null });

      const { updatePassword } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("password", "password123");
      formData.set("confirmPassword", "password123");

      await expect(updatePassword(formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "password123" });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "global" });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockRedirect).toHaveBeenCalledWith("/login?passwordReset=success");
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it("returns a dedicated error when sign-out fails after updating the password", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockUpdateUser.mockResolvedValue({ error: null });
      mockSignOut.mockResolvedValue({ error: { message: "sign out failed" } });

      const { updatePassword } = await import("@/app/(auth)/actions");
      const formData = new FormData();
      formData.set("password", "password123");
      formData.set("confirmPassword", "password123");

      const result = await updatePassword(formData);

      expect(result).toEqual({
        error: "Your password was updated, but we couldn't complete sign-out. Please try again.",
      });
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "password123" });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "global" });
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockCaptureException).toHaveBeenCalledWith(
        { message: "sign out failed" },
        { tags: { action: "update_password_sign_out" } }
      );
    });
  });
});
