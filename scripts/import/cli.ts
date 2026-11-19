import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { extractWorkbook } from "./extract";
import { transform } from "./transform";
import { validateImport } from "./validate";
import { loadImport } from "./load";
import { assertCommitTarget, targetFingerprint, targetFromUrl } from "./target";

const fixture = path.resolve("fixtures/fake-sheet/junabooth-fake.xlsx");
const reportDir = path.resolve("data/private");

async function dryRun() {
  const extracted = await extractWorkbook(fixture);
  const data = transform(extracted.rows);
  const problems = validateImport(data);
  const fileSha256 = crypto.createHash("sha256").update(fs.readFileSync(fixture)).digest("hex");
  const summary = { fileSha256, counts: { leads: data.leads.length, bookings: data.bookings.length, payments: data.payments.length, expenses: data.expenses.filter((row) => row.amount !== null).length, capitalEntries: data.capitalEntries.length }, warnings: data.warnings, reviewItems: problems, duplicates: extracted.duplicateIds, skippedSheets: extracted.skippedSheets };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "fake-import-review.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (process.argv.includes("--strict") && problems.some((problem) => problem.severity === "blocking")) process.exitCode = 2;
}

async function commit() {
  const raw = process.env.DIRECT_URL;
  if (!raw) throw new Error("DIRECT_URL is required.");
  const url = new URL(raw); url.searchParams.set("schema", "import_scratch");
  const target = targetFromUrl(url.toString());
  assertCommitTarget(target, process.env.IMPORT_TARGET_CONFIRM, process.argv.includes("--allow-public"));
  const decisions = JSON.parse(fs.readFileSync(path.resolve("scripts/import/decisions.example.json"), "utf8")) as Record<string, unknown>;
  const unanswered = Object.entries(decisions).filter(([, value]) => value === null).map(([key]) => key);
  if (unanswered.length && !process.argv.includes("--force")) throw new Error(`Import commit refused: unanswered decisions: ${unanswered.join(", ")}`);
  const extracted = await extractWorkbook(fixture); const data = transform(extracted.rows); const problems = validateImport(data);
  if (problems.some((problem) => problem.severity === "blocking") && !process.argv.includes("--force")) throw new Error("Import commit refused: blocking review items exist.");
  const sha = crypto.createHash("sha256").update(fs.readFileSync(fixture)).digest("hex");
  console.log(`Target fingerprint ${targetFingerprint(target)}; file SHA-256 ${sha}.`);
  console.log(await loadImport(data, sha, decisions));
}

if (process.argv[2] === "dry") dryRun();
else if (process.argv[2] === "commit") commit();
else { console.error("Usage: tsx scripts/import/cli.ts dry|commit"); process.exitCode = 1; }
