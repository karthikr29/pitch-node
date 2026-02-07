import { test, expect } from "@playwright/test";

// Note: These tests verify that unauthenticated users are properly
// redirected. Tests requiring authentication would need a test user
// and auth setup in a beforeEach hook.

test.describe("Dashboard Navigation", () => {
  test("dashboard redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe("Public Pages", () => {
  test("home page loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PitchNode/);
  });

  test("home page renders hero section", async ({ page }) => {
    await page.goto("/");
    // The page should have visible content
    await expect(page.locator("main")).toBeVisible();
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");
    // Should show the login form
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test("home page has header navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
  });

  test("home page has footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });
});
