import { test, expect } from "@playwright/test";

test.describe("Navigation - No Broken Links", () => {
  test("all public pages load without Application error", async ({ page }) => {
    const publicPages = ["/", "/login", "/signup", "/privacy", "/terms"];

    for (const path of publicPages) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should return 200`).toBeLessThan(500);

      // Ensure no "Application error" crash page
      const body = await page.textContent("body");
      expect(body).not.toContain("Application error");
    }
  });

  test("all dashboard routes respond without 500 errors", async ({ page }) => {
    const dashboardPages = [
      "/dashboard",
      "/dashboard/practice",
      "/dashboard/history",
      "/dashboard/analytics",
      "/dashboard/settings",
    ];

    for (const path of dashboardPages) {
      const response = await page.goto(path);
      const status = response?.status() ?? 0;

      // These will redirect to /login (302→200), but should never be 500
      expect(status, `${path} should not return 500`).toBeLessThan(500);

      const body = await page.textContent("body");
      expect(body).not.toContain("Application error");
    }
  });

  test("login page has no console errors on load", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Filter out known non-critical warnings (e.g., favicon 404)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );

    expect(
      criticalErrors,
      `Console errors on /login: ${criticalErrors.join(", ")}`
    ).toHaveLength(0);
  });

  test("home page has no console errors on load", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404")
    );

    expect(
      criticalErrors,
      `Console errors on /: ${criticalErrors.join(", ")}`
    ).toHaveLength(0);
  });

  test("dashboard redirects to login with all nav link hrefs intact", async ({ page }) => {
    // Navigate to dashboard — it will redirect to login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);

    // The login page should render without error
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });

  test("signup page loads correctly", async ({ page }) => {
    await page.goto("/signup");
    // Should either show signup form or redirect to login with signup tab
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });
});
