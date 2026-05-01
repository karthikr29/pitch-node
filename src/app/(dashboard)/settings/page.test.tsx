import { describe, expect, it, vi, beforeEach } from "vitest";
import type React from "react";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, setMockUser, setMockUserPlan, setMockUserProfile, waitFor } from "@/test/utils";
import SettingsPage from "./page";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/settings");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    setMockUser({
      id: "user-1",
      email: "test@example.com",
      user_metadata: { full_name: "Profile User" },
      app_metadata: { provider: "email" },
    } as any);
    setMockUserProfile({
      email: "test@example.com",
      fullName: "Profile User",
      avatarUrl: "https://lh3.googleusercontent.com/avatar.png",
      age: 34,
      gender: "prefer_not_to_say",
      phone: "+15551234567",
      company: "Acme",
      jobTitle: "Account Executive",
      country: "India",
      timezone: "Asia/Kolkata",
      planType: "free",
      subscriptionStatus: "active",
    });
    setMockUserPlan({
      type: "free",
      creditsRemaining: 600,
      creditsLimit: 600,
      creditsScope: "lifetime",
      periodEnd: null,
    });
  });

  it("renders personal details with read-only email and profile fields", () => {
    render(<SettingsPage />);

    expect(screen.getAllByText("Personal Details").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByDisplayValue("Profile User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("34")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Account Executive")).toBeInTheDocument();
  });

  it("switches to Security from the settings navigation", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Security" })[0]);

    expect(screen.getAllByText("Security").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
  });

  it("submits password changes to the password route", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "Security" })[0]);
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Password" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/password",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            currentPassword: "old-password",
            newPassword: "new-password",
          }),
        })
      );
    });
    await screen.findByText("Password updated successfully.");
  });

  it("opens Plan & Upgrade from the section query param", () => {
    window.history.replaceState(null, "", "/settings?section=plan");
    render(<SettingsPage />);

    expect(screen.getAllByText("Plan & Upgrade").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Warm Up")).toBeInTheDocument();
    expect(screen.getByText("600 left")).toBeInTheDocument();
  });

  it("does not render active theme styling during server render", () => {
    const html = renderToString(<SettingsPage />);

    expect(html).not.toContain("border-primary bg-primary/5");
  });
});
