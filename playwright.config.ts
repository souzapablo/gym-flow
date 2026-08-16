import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const sessionCookie = process.env.GYM_FLOW_E2E_SESSION_COOKIE;

if (!baseURL || !sessionCookie) {
  throw new Error("Playwright lifecycle environment is incomplete");
}

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    extraHTTPHeaders: { Cookie: sessionCookie },
    trace: "on-first-retry",
  },
});
