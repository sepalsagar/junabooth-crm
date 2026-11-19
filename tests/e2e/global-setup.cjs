const { randomBytes } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const { request } = require("@playwright/test");

function runTsx(script, env) {
  const executable = process.execPath;
  execFileSync(executable, [
    "--import=tsx",
    "node_modules/tsx/dist/cli.mjs",
    script,
  ], {
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });
}

module.exports = async function globalSetup() {
  if (process.env.E2E !== "1") {
    throw new Error("E2E=1 is required");
  }

  const suffix = randomBytes(6).toString("hex");
  const salesEmail = `sales-${suffix}@e2e.invalid`;
  const disabledEmail = `disabled-${suffix}@e2e.invalid`;
  const salesPassword = randomBytes(18).toString("base64url");
  const disabledPassword = randomBytes(18).toString("base64url");
  const childEnv = {
    ...process.env,
    E2E: "1",
    E2E_SALES_EMAIL: salesEmail,
    E2E_SALES_PASSWORD: salesPassword,
    E2E_DISABLED_EMAIL: disabledEmail,
    E2E_DISABLED_PASSWORD: disabledPassword,
  };

  runTsx("scripts/e2e/create-users.ts", childEnv);
  Object.assign(process.env, {
    E2E_SALES_EMAIL: salesEmail,
    E2E_SALES_PASSWORD: salesPassword,
    E2E_DISABLED_EMAIL: disabledEmail,
    E2E_DISABLED_PASSWORD: disabledPassword,
  });

  mkdirSync(".playwright-artifacts", { recursive: true });

  const identities = [
    ["sales", salesEmail, salesPassword],
    [
      "partner",
      process.env.SEED_PARTNER_1_EMAIL,
      process.env.SEED_PARTNER_1_PASSWORD,
    ],
  ];

  for (const [role, email, password] of identities) {
    if (!email || !password) {
      throw new Error(`SEED_PARTNER_1 credentials are required for ${role}`);
    }
    const api = await request.newContext({
      baseURL: "http://127.0.0.1:3000",
      extraHTTPHeaders: { Origin: "http://127.0.0.1:3000" },
    });
    const response = await api.post("/api/auth/sign-in/email", {
      data: { email, password },
    });
    if (!response.ok()) {
      await api.dispose();
      throw new Error(`E2E ${role} login failed`);
    }
    await api.storageState({
      path: `.playwright-artifacts/${role}-storage.json`,
    });
    await api.dispose();
  }

  const disabledApi = await request.newContext({
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: { Origin: "http://localhost:3000" },
  });
  const disabledResponse = await disabledApi.post("/api/auth/sign-in/email", {
    data: { email: disabledEmail, password: disabledPassword },
  });
  await disabledApi.dispose();
  if (disabledResponse.status() !== 401) {
    throw new Error("E2E disabled login was not rejected");
  }
};
