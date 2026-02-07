import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthShell } from "../auth-shell";

vi.mock("@/components/ui", () => ({
  StarryBackground: () => <div data-testid="starry-bg" />,
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
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

describe("AuthShell", () => {
  it("renders children", () => {
    render(
      <AuthShell>
        <div data-testid="child">Login Form</div>
      </AuthShell>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders the starry background", () => {
    render(<AuthShell><div>content</div></AuthShell>);
    expect(screen.getByTestId("starry-bg")).toBeInTheDocument();
  });

  it("renders the logo linking to home", () => {
    render(<AuthShell><div>content</div></AuthShell>);
    const logoLink = screen.getByText("node").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders 'Back to home' link", () => {
    render(<AuthShell><div>content</div></AuthShell>);
    const backLink = screen.getByText("Back to home");
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });
});
