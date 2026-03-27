import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { ForgotPasswordForm } from "../forgot-password-form";

const mockResetPassword = vi.fn();

vi.mock("@/app/(auth)/actions", () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
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

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the invalid-link query string as a dedicated status view", () => {
    render(<ForgotPasswordForm initialError="invalid_or_expired" />);

    expect(screen.getByText("Reset link unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This password reset link is invalid, expired, or already used. Request a new one to continue."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request a new reset link/i })
    ).toBeInTheDocument();
  });

  it("validates email format before submitting", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "bad-email");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("shows the generic success state after submission", async () => {
    mockResetPassword.mockResolvedValue({
      success: "If we found an account for that email, we sent a reset link.",
    });

    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Check your email")).toBeInTheDocument();
    expect(
      screen.getAllByText("If we found an account for that email, we sent a reset link.")
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: /send another link/i })).toBeInTheDocument();
  });
});
