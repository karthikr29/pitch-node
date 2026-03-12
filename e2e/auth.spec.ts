import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    // The login page uses a tab-based Sign In / Sign Up toggle
    await expect(page.getByText("Sign In", { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test("signup tab renders name and confirm password fields", async ({ page }) => {
    await page.goto("/login");
    // Click the Sign Up tab
    await page.getByText("Sign Up").click();
    await expect(page.getByPlaceholder(/full name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/confirm password/i)).toBeVisible();
  });

  test("shows validation error for short password", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/email/i).fill("test@example.com");
    await page.getByPlaceholder(/password/i).fill("123");
    // Click the Sign In submit button
    await page.locator("form button[type='submit']").click();
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
  });

  test("shows ConvoSparr branding on login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("ConvoSparr")).toBeVisible();
  });

  test("has back to home link", async ({ page }) => {
    await page.goto("/login");
    const backLink = page.getByText("Back to home");
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL("/");
  });
});
