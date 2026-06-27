// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * FinGenie Playwright E2E config.
 *
 * Environment variables:
 *   PLAYWRIGHT_BASE_URL  — frontend origin (default: http://localhost:3000)
 *
 * Usage:
 *   npx playwright test          # run all E2E tests
 *   npx playwright test e2e/smoke.spec.js --headed   # run smoke tests with UI
 *
 * CI notes:
 *   - webServer block starts CRA dev server if not already running.
 *   - Tests that require an authenticated session are skipped when no backend
 *     is available (see individual test guards).
 *   - Qwen model is NEVER loaded by E2E tests — they operate on the frontend only.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Don't store credentials between tests — each test starts fresh
    storageState: undefined,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Starts the React dev server before tests if not already running.
  // Set PLAYWRIGHT_BASE_URL if your dev server runs on a different port.
  webServer: {
    command: "npm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // CRA dev server writes to stderr even on success — suppress
    stdout: "pipe",
    stderr: "ignore",
  },
});
