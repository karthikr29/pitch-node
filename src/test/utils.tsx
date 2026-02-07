import { render, type RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

// Mock auth context
const mockAuthContext = {
  user: null as any,
  loading: false,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
};

export function setMockUser(user: { id: string; email: string; user_metadata?: Record<string, unknown> } | null) {
  mockAuthContext.user = user;
}

export function setMockLoading(loading: boolean) {
  mockAuthContext.loading = loading;
}

export function getMockAuthContext() {
  return mockAuthContext;
}

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

function AllProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
