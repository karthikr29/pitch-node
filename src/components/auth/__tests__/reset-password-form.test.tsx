import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { ResetPasswordForm } from "../reset-password-form";

const mockUpdatePassword = vi.fn();

vi.mock("@/app/(auth)/actions", () => ({
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
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

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the invalid-link state with the shared status layout", () => {
    render(<ResetPasswordForm hasRecoverySession={false} />);

    expect(screen.getByText("Reset link unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This password reset link is invalid, expired, or already used. Request a new one to continue."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Request a fresh reset email to continue.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new reset link/i })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  it("validates password confirmation before submitting", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm hasRecoverySession />);

    await user.type(screen.getByLabelText("New Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password321");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("renders independent visibility toggles for both password fields", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm hasRecoverySession />);

    const newPasswordInput = screen.getByLabelText("New Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");

    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show new password/i }));

    expect(newPasswordInput).toHaveAttribute("type", "text");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /hide new password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show confirm password/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show confirm password/i }));

    expect(newPasswordInput).toHaveAttribute("type", "text");
    expect(confirmPasswordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /hide new password/i }));

    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "text");
  });

  it("shows action errors returned by the server action", async () => {
    mockUpdatePassword.mockResolvedValue({
      error: "This reset link is invalid or has expired. Request a new one.",
    });

    const user = userEvent.setup();
    render(<ResetPasswordForm hasRecoverySession />);

    await user.type(screen.getByLabelText("New Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByText("This reset link is invalid or has expired. Request a new one.")
    ).toBeInTheDocument();
  });
});
