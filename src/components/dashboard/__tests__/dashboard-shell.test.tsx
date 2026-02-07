import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardShell } from "../dashboard-shell";

vi.mock("@/components/dashboard/sidebar", () => ({
  Sidebar: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="sidebar" data-open={open}>
      <button data-testid="close-sidebar" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock("@/components/dashboard/top-bar", () => ({
  TopBar: ({ onMenuClick }: { onMenuClick: () => void }) => (
    <div data-testid="topbar">
      <button data-testid="menu-button" onClick={onMenuClick}>
        Menu
      </button>
    </div>
  ),
}));

describe("DashboardShell", () => {
  it("renders children", () => {
    render(
      <DashboardShell>
        <div data-testid="child">Dashboard Content</div>
      </DashboardShell>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders sidebar and topbar", () => {
    render(<DashboardShell><div>content</div></DashboardShell>);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
  });

  it("sidebar starts closed", () => {
    render(<DashboardShell><div>content</div></DashboardShell>);
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
  });

  it("opens sidebar when menu button is clicked", () => {
    render(<DashboardShell><div>content</div></DashboardShell>);
    fireEvent.click(screen.getByTestId("menu-button"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "true");
  });

  it("closes sidebar when close is clicked", () => {
    render(<DashboardShell><div>content</div></DashboardShell>);
    fireEvent.click(screen.getByTestId("menu-button"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "true");
    fireEvent.click(screen.getByTestId("close-sidebar"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-open", "false");
  });
});
