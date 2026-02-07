import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();

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
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
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

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
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
