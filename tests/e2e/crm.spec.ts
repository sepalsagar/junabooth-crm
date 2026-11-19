import { test, expect } from "@playwright/test";

const email = process.env.SEED_PARTNER_1_EMAIL;
const password = process.env.SEED_PARTNER_1_PASSWORD;

test.describe("CRM authentication and responsive smoke", () => {
  test.skip(!email || !password, "SEED_PARTNER_1_EMAIL/PASSWORD are required for E2E login");

  test("wrong password is generic, login survives refresh, and sign out works", async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.screenshot({ path: ".playwright-artifacts/login-390.png", fullPage: true });
    await page.getByLabel("Email").fill(email!);
    const wrong = await request.post("/api/auth/sign-in/email", { data: { email, password: "intentionally-wrong-password" }, headers: { Origin: "http://127.0.0.1:3000" } });
    expect(wrong.status()).toBe(401);
    expect((await wrong.json()).message).toBe("Invalid email or password");
    await page.waitForTimeout(11_000);
    await page.getByRole("textbox", { name: "Password" }).fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/overview$/);
    await page.screenshot({ path: ".playwright-artifacts/overview-390.png", fullPage: true });
    await page.reload();
    await expect(page).toHaveURL(/\/overview$/);
    for (const [path, file] of [["/leads", "leads"], ["/bookings", "bookings"], ["/calendar", "calendar"]] as const) {
      await page.goto(path);
      await page.screenshot({ path: `.playwright-artifacts/${file}-390.png`, fullPage: true });
    }
    const signOut = page.getByRole("button", { name: "Sign out" });
    if (!(await signOut.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    }
    await signOut.click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("logged-out CSV export is unauthorized", async ({ request }) => {
    const response = await request.get("/reports/export?month=2026-11");
    expect(response.status()).toBe(401);
  });
});

test("disabled login remains generic", async ({ request }) => {
  const response = await request.post("/api/auth/sign-in/email", { data: { email: "disabled-current@e2e.invalid", password: "not-the-password" }, headers: { Origin: "http://127.0.0.1:3000" } });
  expect(response.status()).toBe(401);
  expect((await response.json()).message).toBe("Invalid email or password");
});
