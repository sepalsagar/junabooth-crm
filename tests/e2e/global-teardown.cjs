const { execFileSync } = require("node:child_process");
const { rmSync } = require("node:fs");

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

module.exports = async function globalTeardown() {
  if (process.env.E2E !== "1") {
    throw new Error("E2E=1 is required");
  }

  runTsx("scripts/e2e/delete-users.ts", {
    ...process.env,
    E2E: "1",
  });

  for (const file of ["sales-storage.json", "partner-storage.json"]) {
    rmSync(`.playwright-artifacts/${file}`, { force: true });
  }
};
