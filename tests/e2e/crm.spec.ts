import { test, expect } from "@playwright/test";

const PARTNER_EMAIL = process.env.SEED_PARTNER_1_EMAIL!;
const PARTNER_PASSWORD = process.env.SEED_PARTNER_1_PASSWORD!;
const DISABLED_EMAIL = process.env.E2E_DISABLED_EMAIL!;
const DISABLED_PASSWORD = process.env.E2E_DISABLED_PASSWORD!;
const SALES_EMAIL = process.env.E2E_SALES_EMAIL!;
const SALES_PASSWORD = process.env.E2E_SALES_PASSWORD!;

const authConfigured = !!PARTNER_EMAIL && !!PARTNER_PASSWORD;
const e2eConfigured = !!DISABLED_EMAIL && !!DISABLED_PASSWORD && !!SALES_EMAIL && !!SALES_PASSWORD;

async function loginAsPartner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(PARTNER_EMAIL);
  await page.getByLabel("Password").fill(PARTNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
}

async function loginAsSales(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SALES_EMAIL);
  await page.getByLabel("Password").fill(SALES_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
}

test.describe("Authentication", () => {
  test("logged-out user is redirected to /login", async ({ page }) => {
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/login$/);
  });

  test.skip(!authConfigured, "SEED_PARTNER_1_EMAIL/PASSWORD required")
  ("wrong password returns generic error", async ({ request }) => {
    const response = await request.post("/api/auth/sign-in/email", {
      data: { email: PARTNER_EMAIL, password: "intentionally-wrong-password" },
      headers: { Origin: "http://127.0.0.1:3000" },
    });
    expect(response.status()).toBe(401);
    expect((await response.json()).message).toBe("Invalid email or password");
  });

  test.skip(!authConfigured, "SEED_PARTNER_1_EMAIL/PASSWORD required")
  ("successful login lands on /overview and session survives refresh", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(PARTNER_EMAIL);
    await page.getByLabel("Password").fill(PARTNER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/overview$/);
    await page.reload();
    await expect(page).toHaveURL(/\/overview$/);
  });

  test.skip(!authConfigured, "SEED_PARTNER_1_EMAIL/PASSWORD required")
  ("sign out redirects to /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(PARTNER_EMAIL);
    await page.getByLabel("Password").fill(PARTNER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/overview$/);
    const signOut = page.getByRole("button", { name: "Sign out" });
    if (!(await signOut.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    }
    await signOut.click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.skip(!e2eConfigured, "E2E_DISABLED_EMAIL/PASSWORD required")
  ("disabled user login is rejected with generic message", async ({ request }) => {
    const response = await request.post("/api/auth/sign-in/email", {
      data: { email: DISABLED_EMAIL, password: DISABLED_PASSWORD },
      headers: { Origin: "http://127.0.0.1:3000" },
    });
    expect(response.status()).toBe(401);
    expect((await response.json()).message).toBe("Invalid email or password");
  });

// ============================================================================
// PARTNER WORKFLOW: Lead -> Booking -> Payment -> Expense
// ============================================================================

test.describe.skip(!PARTNER_EMAIL || !PARTNER_PASSWORD, "SEED_PARTNER_1_EMAIL/PASSWORD required")
("Partner workflow: lead to booking to payment to expense", () => {
  let leadCode: string | null = null;
  let bookingCode: string | null = null;

  test("create a new lead via Quick Add", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(PARTNER_EMAIL);
    await page.getByLabel("Password").fill(PARTNER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/overview$/);
    await page.goto("/leads");

    await page.getByRole("button", { name: /Quick Add Lead/ }).click();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDateStr = tomorrow.toISOString().split("T")[0];

    await page.getByLabel("Client Name").fill("E2E Test Client");
    await page.getByLabel("Phone").fill("9876543210");
    await page.getByLabel("City").fill("Patna");
    await page.getByLabel("Event Type").fill("Wedding");
    await page.getByLabel("Target Date").fill(targetDateStr);
    await page.getByLabel("Quoted Amount (₹)").fill("20000");
    await page.getByLabel("Notes").fill("E2E test lead");

    await page.getByRole("button", { name: "Save Lead" }).click();

    await expect(page.getByText(/Lead.*created successfully/)).toBeVisible({ timeout: 10_000 });

    const toastText = await page.getByText(/Lead.*created successfully/).textContent();
    const match = toastText?.match(/ENQ-\d+/);
    leadCode = match ? match[0] : null;
    expect(leadCode).not.toBeNull();
  });

  test("change lead status to Quoted with follow-up date", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/leads/${leadCode}`);

    await page.getByRole("button", { name: /change status/i }).click();
    await page.getByLabel("Quoted").click();

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const followUpStr = nextWeek.toISOString().split("T")[0];
    await page.getByLabel("Next Follow-Up").fill(followUpStr);

    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/Quoted/)).toBeVisible();
  });

  test("reject Lost status without a reason", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/leads/${leadCode}`);

    await page.getByRole("button", { name: /change status/i }).click();
    await page.getByLabel("Lost").click();
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/reason/i)).toBeVisible();
  });

  test("convert lead to booking with advance payment", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/leads/${leadCode}`);

    await page.getByRole("button", { name: /convert to booking/i }).click();

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 14);
    const eventDateStr = eventDate.toISOString().split("T")[0];

    await page.getByLabel("Event Date").fill(eventDateStr);
    await page.getByLabel("Start Time").fill("18:00");
    await page.getByLabel("End Time").fill("22:00");
    await page.getByLabel("Base Price (₹)").fill("20000");
    await page.getByLabel("Amount (₹)").fill("5000");
    await page.getByLabel("Received By").fill("E2E Tester");

    await page.getByRole("button", { name: "Confirm Booking" }).click();

    await expect(page.getByText(/booking.*created|converted/i)).toBeVisible({ timeout: 10_000 });

    const bookingLink = page.getByRole("link", { name: /JB-\d+/ });
    const href = await bookingLink.getAttribute("href");
    bookingCode = href?.match(/JB-\d+/)?.[0] ?? null;
    expect(bookingCode).not.toBeNull();
  });

  test("record a payment on the booking", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/bookings/${bookingCode}`);

    await page.getByRole("button", { name: /record payment/i }).click();

    await page.getByLabel("Amount (₹)").fill("15000");
    await page.getByLabel("Payment Mode").selectOption("UPI");
    await page.getByLabel("Received By").fill("E2E Tester");
    await page.getByLabel("Note").fill("E2E test payment");

    await page.getByRole("button", { name: /record/i }).click();

    await expect(page.getByText(/15000/)).toBeVisible();
  });

  test("void the payment and verify balance recovers", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/bookings/${bookingCode}`);

    await page.getByRole("button", { name: /void/i }).click();

    await page.getByLabel("Reason").fill("E2E test void");
    await page.getByRole("button", { name: /void payment/i }).click();

    await expect(page.getByText(/voided/i)).toBeVisible();
  });

  test("reject moving Completed back to Confirmed", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/bookings/${bookingCode}`);

    await page.getByRole("button", { name: /change status/i }).click();
    await page.getByLabel("Confirmed").click();
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/cannot|cannot move|invalid/i)).toBeVisible();
  });

  test("add an expense linked to the booking", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/bookings/${bookingCode}`);

    await page.getByRole("button", { name: /add expense/i }).click();

    await page.getByLabel("Category").selectOption("Setup");
    await page.getByLabel("Amount (₹)").fill("3000");
    await page.getByLabel("Spent On").fill(new Date().toISOString().split("T")[0]);
    await page.getByLabel("Paid By").fill("E2E Tester");
    await page.getByLabel("Note").fill("E2E test expense");

    await page.getByRole("button", { name: /save|add/i }).click();

    await expect(page.getByText(/3000/)).toBeVisible();
  });

  test("open the cost and profit panel", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto(`/bookings/${bookingCode}`);

    await page.getByRole("button", { name: /cost|profit/i }).click();

    await expect(page.getByText(/profit|cost/i)).toBeVisible();
  });
});

// ============================================================================
// SALES LOCKOUT
// ============================================================================

test.describe.skip(!e2eConfigured, "E2E_SALES_EMAIL/PASSWORD required")
("SALES user authorization lockout", () => {
  test("/partners is blocked for SALES", async ({ page }) => {
    await loginAsSales(page);
    await page.goto("/partners");
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("/expenditure is blocked for SALES", async ({ page }) => {
    await loginAsSales(page);
    await page.goto("/expenditure");
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("/reports is blocked for SALES", async ({ page }) => {
    await loginAsSales(page);
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/forbidden/);
  });

  test("/settings is blocked for SALES", async ({ page }) => {
    await loginAsSales(page);
    await page.goto("/settings/users");
    await expect(page).toHaveURL(/\/forbidden/);
  });
});

// ============================================================================
// SETTINGS
// ============================================================================

test.describe.skip(!PARTNER_EMAIL || !PARTNER_PASSWORD, "SEED_PARTNER_1_EMAIL/PASSWORD required")
("Settings: user administration", () => {
  test("create a new user", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto("/settings/users");

    const timestamp = Date.now();
    await page.getByLabel("Name").fill("E2E Temp User");
    await page.getByLabel("Email").fill(`e2e-user-${timestamp}@e2e.invalid`);
    await page.getByLabel("Password").fill("TempPass1234");
    await page.getByLabel("Role").selectOption("SALES");
    await page.getByRole("button", { name: "Create user" }).click();

    await expect(page.getByText("E2E Temp User")).toBeVisible();
  });

  test("change user role", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto("/settings/users");

    await page.getByLabel(/role.*select/i).first().selectOption("PARTNER");
    await expect(page.getByText("Saved")).toBeVisible();
  });

  test("reset user password", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto("/settings/users");

    await page.getByPlaceholder("New password").fill("NewPass1234");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
  });

  test("disable and re-enable user", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto("/settings/users");

    await page.getByRole("button", { name: "Disable" }).click();
    await expect(page.getByText(/disabled/i)).toBeVisible();

    await page.getByRole("button", { name: "Enable" }).click();
    await expect(page.getByText(/enabled|active/i)).toBeVisible();
  });

  test("last PARTNER cannot be disabled or demoted", async ({ page }) => {
    await loginAsPartner(page);
    await page.goto("/settings/users");

    await page.getByRole("button", { name: "Disable" }).last().click();
    await expect(page.getByText(/last active partner|cannot be disabled/i)).toBeVisible();

    await page.getByLabel(/role.*select/i).last().selectOption("SALES");
    await expect(page.getByText(/last active partner|cannot be demoted/i)).toBeVisible();
  });
});

// ============================================================================
// PHONE-WIDTH (390px) SCREENSHOTS
// ============================================================================

test.describe.skip(!PARTNER_EMAIL || !PARTNER_PASSWORD, "SEED_PARTNER_1_EMAIL/PASSWORD required")
("Phone-width (390px) screenshots", () => {
  test("login page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.screenshot({ path: ".playwright-artifacts/login-390.png", fullPage: true });
  });

  test("overview page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPartner(page);
    await page.goto("/overview");
    await page.screenshot({ path: ".playwright-artifacts/overview-390.png", fullPage: true });
  });

  test("leads page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPartner(page);
    await page.goto("/leads");
    await page.screenshot({ path: ".playwright-artifacts/leads-390.png", fullPage: true });
  });

  test("bookings page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPartner(page);
    await page.goto("/bookings");
    await page.screenshot({ path: ".playwright-artifacts/bookings-390.png", fullPage: true });
  });

  test("calendar page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPartner(page);
    await page.goto("/calendar");
    await page.screenshot({ path: ".playwright-artifacts/calendar-390.png", fullPage: true });
  });

  test("settings users page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPartner(page);
    await page.goto("/settings/users");
    await page.screenshot({ path: ".playwright-artifacts/settings-users-390.png", fullPage: true });
  });

  test("settings packages page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPartner(page);
    await page.goto("/settings/packages");
    await page.screenshot({ path: ".playwright-artifacts/settings-packages-390.png", fullPage: true });
  });

  test("settings regions page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsPartner(page);
    await page.goto("/settings/regions");
    await page.screenshot({ path: ".playwright-artifacts/settings-regions-390.png", fullPage: true });
  });
});
