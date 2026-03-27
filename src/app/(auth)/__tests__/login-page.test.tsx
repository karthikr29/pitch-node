import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "../login/page";

const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("@/app/(auth)/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders the password reset success banner only for the success query param", () => {
    mockSearchParams = new URLSearchParams("passwordReset=success");
    const { rerender } = render(<LoginPage />);

    expect(
      screen.getByText("Password updated successfully. Sign in with your new password.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();

    mockSearchParams = new URLSearchParams("passwordReset=other");
    rerender(<LoginPage />);

    expect(
      screen.queryByText("Password updated successfully. Sign in with your new password.")
    ).not.toBeInTheDocument();
  });
});
