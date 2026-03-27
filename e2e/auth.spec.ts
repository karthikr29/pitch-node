import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("login page shows the password reset success banner when requested", async ({ page }) => {
    await page.goto("/login?passwordReset=success");
    await expect(
      page.getByText("Password updated successfully. Sign in with your new password.")
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("signup page renders name and confirm password fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByPlaceholder(/john doe/i)).toBeVisible();
    await expect(page.getByPlaceholder(/repeat your password/i)).toBeVisible();
  });

  test("forgot-password link navigates to the reset request page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/.*forgot-password/);
    await expect(page.getByText("Reset your password")).toBeVisible();
  });

  test("forgot-password page shows invalid-link recovery state", async ({ page }) => {
    await page.goto("/forgot-password?error=invalid_or_expired");
    await expect(page.getByText("Reset link unavailable")).toBeVisible();
    await expect(
      page.getByText(
        "This password reset link is invalid, expired, or already used. Request a new one to continue."
      )
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveCount(0);
  });

  test("reset-password page shows invalid-link state without a recovery session", async ({ page }) => {
    await page.goto("/auth/reset-password");
    await expect(page.getByText("Reset link unavailable")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /request a new reset link/i })
    ).toBeVisible();
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
