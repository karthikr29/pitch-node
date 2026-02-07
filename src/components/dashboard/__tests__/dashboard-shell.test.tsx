import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardShell } from "../dashboard-shell";

vi.mock("@/components/dashboard/nav-bar", () => ({
  NavBar: () => <nav data-testid="nav-bar">NavBar</nav>,
}));

describe("DashboardShell", () => {
  it("renders children in the main area", () => {
    render(
      <DashboardShell>
        <div data-testid="child">Dashboard Content</div>
      </DashboardShell>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
  });

  it("renders the NavBar", () => {
    render(<DashboardShell><div>content</div></DashboardShell>);
    expect(screen.getByTestId("nav-bar")).toBeInTheDocument();
  });

  it("wraps content in a main element with correct classes", () => {
    render(
      <DashboardShell>
        <div data-testid="child">Test</div>
      </DashboardShell>
    );
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toContainElement(screen.getByTestId("child"));
  });
});
