import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { targetFingerprint, targetFromUrl } from "./target";

const schema = "import_scratch";
const directUrl = process.env.DIRECT_URL;
if (!directUrl) throw new Error("DIRECT_URL is required.");
const url = new URL(directUrl);
url.searchParams.set("schema", schema);
const scratchUrl = url.toString();
const target = targetFromUrl(scratchUrl);

async function run() {
  const client = new Client({ connectionString: directUrl });
  await client.connect();
  if (process.argv[2] === "prepare") {
    console.log(`Preparing schema ${schema}; target fingerprint ${targetFingerprint(target)}.`);
    await client.query("CREATE SCHEMA IF NOT EXISTS import_scratch");
    await client.end();
    process.env.DIRECT_URL = scratchUrl;
    execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
    return;
  }
  if (process.argv[2] === "drop") {
    console.log("About to drop schema import_scratch CASCADE; public schema is not targeted.");
    await client.query("DROP SCHEMA import_scratch CASCADE");
    await client.end();
    console.log("Dropped schema import_scratch.");
    return;
  }
  await client.end();
  throw new Error("Usage: scratch.ts prepare|drop");
}
run();
