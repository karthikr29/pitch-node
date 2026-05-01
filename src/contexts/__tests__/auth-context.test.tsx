import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  }),
}));

import { AuthProvider, useAuth } from "@/contexts/auth-context";

function TestConsumer() {
  const { user, loading, userPlan, userProfile } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <span data-testid="credits">{userPlan?.creditsRemaining ?? "null"}</span>
      <span data-testid="credits-limit">{userPlan?.creditsLimit ?? "null"}</span>
      <span data-testid="credits-scope">{userPlan?.creditsScope ?? "null"}</span>
      <span data-testid="profile-name">{userProfile?.fullName ?? "null"}</span>
      <span data-testid="profile-avatar">{userProfile?.avatarUrl ?? "null"}</span>
      <span data-testid="profile-age">{userProfile?.age ?? "null"}</span>
      <span data-testid="profile-job-title">{userProfile?.jobTitle ?? "null"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it("provides loading=false after getUser resolves with no user", async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("sets user when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/profile") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email: "test@example.com",
            full_name: "Test User",
            avatar_url: "https://lh3.googleusercontent.com/avatar.png",
            age: 34,
            gender: "prefer_not_to_say",
            phone: "+15551234567",
            company: "Acme",
            job_title: "Account Executive",
            country: "India",
            timezone: "Asia/Kolkata",
            plan_type: "free",
            subscription_status: "active",
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          plan_type: "free",
          credits_remaining: 600,
          credits_limit: 600,
          credits_scope: "lifetime",
          period_end: null,
        }),
      });
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    });

    expect(screen.getByTestId("credits").textContent).toBe("600");
    expect(screen.getByTestId("credits-limit").textContent).toBe("600");
    expect(screen.getByTestId("credits-scope").textContent).toBe("lifetime");
    expect(screen.getByTestId("profile-name").textContent).toBe("Test User");
    expect(screen.getByTestId("profile-avatar").textContent).toBe("https://lh3.googleusercontent.com/avatar.png");
    expect(screen.getByTestId("profile-age").textContent).toBe("34");
    expect(screen.getByTestId("profile-job-title").textContent).toBe("Account Executive");
  });

  it("subscribes to auth state changes", async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", async () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    let unmount: () => void;
    await act(async () => {
      const result = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      unmount = result.unmount;
    });

    unmount!();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("returns default values when useAuth is used outside AuthProvider", () => {
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId("user")).toHaveTextContent("null");
  });
});
