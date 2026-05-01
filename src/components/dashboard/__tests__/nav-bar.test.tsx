import { describe, it, expect, vi, beforeEach } from "vitest";
import type React from "react";
import {
  fireEvent,
  render,
  screen,
  setMockUser,
  setMockUserPlan,
  setMockUserProfile,
} from "@/test/utils";
import { NavBar } from "../nav-bar";

// Override usePathname for specific tests
const mockPathname = vi.fn(() => "/dashboard");
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return {
    ...actual,
    usePathname: () => mockPathname(),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      refresh: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
  };
});

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

vi.mock("@/app/(auth)/actions", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/components/layout/theme-toggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} data-testid="user-avatar-image" />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("NavBar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/dashboard");
    setMockUser({
      id: "user-1",
      email: "test@example.com",
      user_metadata: { full_name: "Fallback User" },
    });
    setMockUserProfile({
      email: "test@example.com",
      fullName: "Profile User",
      avatarUrl: "https://lh3.googleusercontent.com/avatar.png",
      age: null,
      gender: null,
      phone: null,
      company: null,
      jobTitle: null,
      country: null,
      timezone: null,
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

  it("renders the ConvoSparr logo text", () => {
    render(<NavBar />);
    expect(screen.getByText("ConvoSparr")).toBeInTheDocument();
  });

  it("renders all 4 nav links on desktop (no Settings)", () => {
    render(<NavBar />);
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Practice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("History").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Analytics").length).toBeGreaterThanOrEqual(1);
  });

  it("renders nav links with correct href values", () => {
    render(<NavBar />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/practice");
    expect(hrefs).toContain("/history");
    expect(hrefs).toContain("/analytics");
  });

  it("does not render the theme toggle as a standalone header control", () => {
    render(<NavBar />);
    expect(screen.queryByTestId("theme-toggle")).not.toBeInTheDocument();
  });

  it("renders credits beside the user menu without a plan name", () => {
    render(<NavBar />);
    expect(screen.getByText("600 credits")).toBeInTheDocument();
    expect(screen.queryByText("Warm Up")).not.toBeInTheDocument();
    expect(screen.queryByText("Performer")).not.toBeInTheDocument();
  });

  it("renders the theme toggle inside the user dropdown", async () => {
    render(<NavBar />);
    fireEvent.pointerDown(screen.getByRole("button", { name: /Profile User/i }));

    expect((await screen.findAllByText("Theme")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("uses the profile-backed avatar image when available", () => {
    render(<NavBar />);
    const avatar = screen.getByAltText("Profile User");
    expect(avatar).toHaveAttribute("src", "https://lh3.googleusercontent.com/avatar.png");
  });

  it("renders mobile hamburger button", () => {
    render(<NavBar />);
    expect(screen.getByLabelText("Toggle navigation menu")).toBeInTheDocument();
  });

  it("toggles mobile menu when hamburger is clicked", () => {
    render(<NavBar />);
    const hamburger = screen.getByLabelText("Toggle navigation menu");

    // Mobile nav should not be visible initially
    // The mobile nav items are in a conditional block
    const mobileNavBefore = screen.queryByText("Sign Out");
    expect(mobileNavBefore).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(hamburger);
    expect(screen.getByText("Sign Out")).toBeInTheDocument();

    // Click to close
    fireEvent.click(hamburger);
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("highlights the active nav link based on pathname", () => {
    mockPathname.mockReturnValue("/practice");
    render(<NavBar />);

    // The Practice link in the desktop nav should have the active class
    const practiceLinks = screen.getAllByText("Practice");
    const desktopLink = practiceLinks.find((link) =>
      link.closest("a")?.className.includes("bg-primary")
    );
    expect(desktopLink).toBeDefined();
  });

  it("Home is active only for exact /dashboard path", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<NavBar />);

    const homeLinks = screen.getAllByText("Home");
    const activeHome = homeLinks.find((link) =>
      link.closest("a")?.className.includes("bg-primary")
    );
    expect(activeHome).toBeDefined();
  });
});
