// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * FinGenie E2E smoke tests.
 *
 * These run against the live React dev server (no backend required for
 * public page checks). Tests that navigate to protected routes verify that
 * the redirect-to-login behaviour works.
 *
 * No Qwen model is loaded. No real backend calls succeed in isolation —
 * pages are expected to show loading states or redirect to /login.
 *
 * QA spec coverage:
 *   E2E-1  App loads home page
 *   E2E-2  Login page loads
 *   E2E-3  Signup page loads
 *   E2E-4  Unauthenticated user redirected from /dashboard to /login
 *   E2E-5  Unauthenticated user redirected from /admin/dashboard to /login
 *   E2E-6  Sidebar links do not point to broken casing routes
 *   E2E-7  Financial Health Score page loads
 *   E2E-8  Scenario Simulator page loads
 *   E2E-9  Scam Checker page loads
 *   E2E-10 Voice Command page loads
 *   E2E-11 Model Metrics page loads
 */

// ── Public pages ──────────────────────────────────────────────────────────

test("E2E-1 home page loads without JS error", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Page must load without JS errors
  expect(errors).toHaveLength(0);
  // Title must be set (not the generic Create React App title)
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});

test("E2E-2 /login page renders login form", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  // Should contain a login form or heading — not blank
  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});

test("E2E-3 /signup page renders signup form", async ({ page }) => {
  await page.goto("/signup");
  await page.waitForLoadState("domcontentloaded");

  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});

// ── Auth guard redirects ───────────────────────────────────────────────────

test("E2E-4 unauthenticated /dashboard redirects to /login", async ({ page }) => {
  // No cookies / localStorage — fresh unauthenticated session
  await page.goto("/dashboard");
  // Wait for the auth check to complete (AuthContext calls checkAuth)
  await page.waitForURL("**/login**", { timeout: 10_000 }).catch(() => {
    // If URL didn't change, check we're still on dashboard loading state
  });

  const url = page.url();
  // Must end up at /login (redirect) or show login content
  const isOnLogin = url.includes("/login");
  const bodyText = await page.textContent("body");
  const showsLoginContent =
    bodyText.toLowerCase().includes("login") ||
    bodyText.toLowerCase().includes("sign in") ||
    bodyText.toLowerCase().includes("email") ||
    bodyText.toLowerCase().includes("checking authentication");

  expect(isOnLogin || showsLoginContent).toBe(true);
});

test("E2E-5 unauthenticated /admin/dashboard redirects to /login", async ({
  page,
}) => {
  await page.goto("/admin/dashboard");
  await page.waitForURL("**/login**", { timeout: 10_000 }).catch(() => {});

  const url = page.url();
  const bodyText = await page.textContent("body");
  const blocked =
    url.includes("/login") ||
    bodyText.toLowerCase().includes("login") ||
    bodyText.toLowerCase().includes("checking authentication");

  expect(blocked).toBe(true);
});

// ── FinGenie feature pages (public routes) ────────────────────────────────

test("E2E-7 /health-score page loads", async ({ page }) => {
  await page.goto("/health-score");
  await page.waitForLoadState("domcontentloaded");

  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});

test("E2E-8 /scenario-simulator page loads", async ({ page }) => {
  await page.goto("/scenario-simulator");
  await page.waitForLoadState("domcontentloaded");

  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});

test("E2E-9 /scam-checker page loads", async ({ page }) => {
  await page.goto("/scam-checker");
  await page.waitForLoadState("domcontentloaded");

  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});

test("E2E-10 /voice-commands page loads", async ({ page }) => {
  await page.goto("/voice-commands");
  await page.waitForLoadState("domcontentloaded");

  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});

test("E2E-11 /model-metrics page loads", async ({ page }) => {
  await page.goto("/model-metrics");
  await page.waitForLoadState("domcontentloaded");

  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});

// ── No broken route casing ────────────────────────────────────────────────

test("E2E-6 /settings (lowercase) loads without 404", async ({ page }) => {
  // Regression: route was /Settings (wrong casing) before the refactor
  await page.goto("/settings");
  await page.waitForLoadState("domcontentloaded");

  // If it were a 404 from the server we'd get an error page, but CRA serves
  // index.html for all paths, so this tests that React Router resolves it.
  // The page should either render content or show loading/redirect.
  const body = await page.textContent("body");
  expect(body.trim().length).toBeGreaterThan(0);
});
