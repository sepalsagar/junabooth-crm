import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { request } from "@playwright/test";
export default async function globalSetup() {
  if (process.env.E2E !== "1") throw new Error("E2E=1 is required");
  const suffix = randomBytes(6).toString("hex"); const salesEmail = `sales-${suffix}@e2e.invalid`; const disabledEmail = `disabled-${suffix}@e2e.invalid`; const salesPassword = randomBytes(18).toString("base64url"); const disabledPassword = randomBytes(18).toString("base64url");
  const env = { ...process.env, E2E: "1", E2E_SALES_EMAIL: salesEmail, E2E_SALES_PASSWORD: salesPassword, E2E_DISABLED_EMAIL: disabledEmail, E2E_DISABLED_PASSWORD: disabledPassword };
  execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/e2e/create-users.ts"], { env, stdio: ["ignore", "inherit", "inherit"] });
  Object.assign(process.env, { E2E_SALES_EMAIL: salesEmail, E2E_SALES_PASSWORD: salesPassword, E2E_DISABLED_EMAIL: disabledEmail, E2E_DISABLED_PASSWORD: disabledPassword }); await mkdir(".playwright-artifacts", { recursive: true });
  const api = await request.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: { Origin: "http://localhost:3000" } });
  for (const [role, email, password] of [["sales", salesEmail, salesPassword], ["partner", process.env.SEED_PARTNER_1_EMAIL, process.env.SEED_PARTNER_1_PASSWORD] ] as const) { if (!email || !password) continue; const response = await api.post("/api/auth/sign-in/email", { data: { email, password } }); if (!response.ok()) throw new Error(`E2E ${role} login failed`); await api.storageState({ path: `.playwright-artifacts/${role}-storage.json` }); }
  await api.dispose();
}
