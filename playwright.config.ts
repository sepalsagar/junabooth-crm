import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  globalSetup: require.resolve("./tests/e2e/global-setup.cjs"),
  globalTeardown: require.resolve("./tests/e2e/global-teardown.cjs"),
  testDir: "./tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: ".playwright-artifacts/report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "npx next dev --webpack --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: "http://127.0.0.1:3000",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      DIRECT_URL: process.env.DIRECT_URL ?? "",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
