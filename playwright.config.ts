import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  globalSetup: require.resolve("./tests/e2e/global-setup.ts"),
  globalTeardown: require.resolve("./tests/e2e/global-teardown.ts"),
  testDir: "./tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: ".playwright-artifacts/report", open: "never" }]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1", url: "http://localhost:3000/login", reuseExistingServer: false, timeout: 120_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
