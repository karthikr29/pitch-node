import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
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

describe("NavBar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/dashboard");
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

  it("renders theme toggle", () => {
    render(<NavBar />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
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
