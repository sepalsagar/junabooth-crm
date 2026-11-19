import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { db } from "@/lib/db";
import { seedAuth } from "@/lib/seed-auth";

const domain = "@e2e.invalid";
export default async function globalSetup() {
  if (process.env.E2E !== "1") throw new Error("E2E=1 is required");
  const suffix = "current";
  const password = randomBytes(18).toString("base64url");
  const disabledPassword = randomBytes(18).toString("base64url");
  const salesEmail = `sales-${suffix}${domain}`;
  const disabledEmail = `disabled-${suffix}${domain}`;
  await seedAuth.api.signUpEmail({ body: { name: "E2E Sales", email: salesEmail, password } });
  await seedAuth.api.signUpEmail({ body: { name: "E2E Disabled", email: disabledEmail, password: disabledPassword } });
  await db.user.update({ where: { email: salesEmail }, data: { role: "SALES" } });
  await db.user.update({ where: { email: disabledEmail }, data: { role: "SALES", disabled: true } });
  process.env.E2E_SALES_EMAIL = salesEmail;
  process.env.E2E_SALES_PASSWORD = password;
  process.env.E2E_DISABLED_EMAIL = disabledEmail;
  process.env.E2E_DISABLED_PASSWORD = disabledPassword;
  await mkdir(".playwright-artifacts", { recursive: true });
}
