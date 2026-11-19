import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
export default async function globalTeardown() { if (process.env.E2E !== "1") throw new Error("E2E=1 is required"); execFileSync("npx", ["tsx", "scripts/e2e/delete-users.ts"], { env: { ...process.env, E2E: "1" }, stdio: ["ignore", "inherit", "inherit"] }); await Promise.all(["sales-storage.json", "partner-storage.json"].map((f) => rm(`.playwright-artifacts/${f}`, { force: true }))); }
