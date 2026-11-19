import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { extractWorkbook } from "./extract";
import { transform } from "./transform";
import { validateImport } from "./validate";

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

if (process.argv[2] === "dry") dryRun();
else { console.error("Usage: tsx scripts/import/cli.ts dry [--strict]"); process.exitCode = 1; }
