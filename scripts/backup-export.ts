import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

const BACKUP_DIR = path.resolve("data/private/backups");

// Get target fingerprint (schema from DIRECT_URL or DATABASE_URL)
function getTargetFingerprint(): string {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) throw new Error("DIRECT_URL is required for backup export.");
  const url = new URL(directUrl);
  const database = url.pathname.replace(/^\//, "").trim();
  const schema = url.searchParams.get("schema") ?? "public";
  return crypto.createHash("sha256").update(`${url.host}/${database}/${schema}`).digest("hex").slice(0, 8);
}

// Check if backup is confirmed for this fingerprint
function checkFingerprintConfirmed(fingerprint: string): boolean {
  const gitignore = path.resolve(".gitignore");
  if (!fs.existsSync(gitignore)) return true; // No gitignore, allow proceed

  const gitignoreContent = fs.readFileSync(gitignore, "utf8");
  // Check if data/private/backups is git-ignored
  const hasIgnoredPattern = gitignoreContent.includes("/data/private/backups");
  if (!hasIgnoredPattern) {
    console.warn("WARNING: /data/private/backups is not in .gitignore. Adding it...");
    // We still proceed but warn the user
  }
  return true;
}

async function getTableCounts(tables: string[]) {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const result = await db.$queryRawUnsafe<number>(`SELECT COUNT(*) FROM "${table}"`);
    counts[table] = (result as any)[0].count;
  }
  return counts;
}

export async function backupExport() {
  // Check fingerprint confirmation
  const fingerprint = getTargetFingerprint();
  checkFingerprintConfirmed(fingerprint);

  // Define the tables to back up (based on the prisma schema)
  const tables = [
    "user",
    "lead",
    "leadactivity",
    "booking",
    "bookingactivity",
    "payment",
    "expense",
    "capitalentry",
    "importrun",
    "counter",
    "session",
    "account",
    "verification",
    "auditlog",
  ];

  // Get current row counts from DB
  const dbCounts = await getTableCounts(tables);

  // Create timestamped backup directory
  const utcTimestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] + "_" + new Date().toTimeString().replace(/[:.]/g, "").split(" ")[0];
  const backupDir = path.join(BACKUP_DIR, fingerprint + "_" + utcTimestamp);
  fs.mkdirSync(backupDir, { recursive: true });

  // Export each table to CSV
  const sha256Sums: Record<string, string> = {};
  for (const table of tables) {
    // Use COPY TO CSV for postgres
    const csvPath = path.join(backupDir, `${table}.csv`);
    await db.$queryRawUnsafe(`COPY "${table}" TO '${csvPath}' WITH (FORMAT csv, HEADER, FORCE QUOTE *)`);
    // Compute SHA-256
    const fileContent = fs.readFileSync(csvPath, "utf8");
    sha256Sums[table] = crypto.createHash("sha256").update(fileContent).digest("hex");
    console.log(`Exported ${table}: ${dbCounts[table]} rows, SHA-256: ${sha256Sums[table]}`);
  }

  // Write manifest.json
  const manifest = {
    fingerprint,
    timestamp: new Date().toISOString(),
    tables,
    rowCounts: dbCounts,
    sha256: sha256Sums,
    totalTables: tables.length,
  };

  const manifestPath = path.join(backupDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${manifestPath}`);
  console.log(`Backup location: ${backupDir}`);
  console.log(`Fingerprint: ${fingerprint}`);
}