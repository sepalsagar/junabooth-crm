/**
 * Live DB write-read verification script
 * Creates a test booking + activity, reads it back, then cleans up.
 * Run: npx tsx scripts/db-write-verify.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("\n🔍 Junabooth CRM — Live Supabase Write Verification\n");
  const results: { check: string; status: "PASS" | "FAIL"; detail: string }[] = [];

  // ── 1. Can we read existing bookings? ──────────────────────────────────
  const bookingCount = await db.booking.count();
  results.push({
    check: "Read existing bookings",
    status: bookingCount > 0 ? "PASS" : "FAIL",
    detail: `${bookingCount} bookings in DB`,
  });

  // ── 2. Can we read existing users? ─────────────────────────────────────
  const userCount = await db.user.count();
  results.push({
    check: "Read existing users",
    status: userCount > 0 ? "PASS" : "FAIL",
    detail: `${userCount} users in DB`,
  });

  // ── 3. Write a test lead ────────────────────────────────────────────────
  const testLead = await db.lead.create({
    data: {
      code: `TEST-VERIFY-${Date.now()}`,
      clientName: "__DB_VERIFY_TEST__",
      phone: "9999999999",
      city: "TestCity",
      status: "NEW",
      source: "WEBSITE",
    },
  });
  results.push({
    check: "Write test lead to DB",
    status: testLead?.id ? "PASS" : "FAIL",
    detail: `Lead ID: ${testLead.id}`,
  });

  // ── 4. Read it back immediately ─────────────────────────────────────────
  const readBack = await db.lead.findUnique({ where: { id: testLead.id } });
  results.push({
    check: "Read back written lead",
    status: readBack?.clientName === "__DB_VERIFY_TEST__" ? "PASS" : "FAIL",
    detail: readBack ? `Found: ${readBack.clientName}` : "NOT FOUND",
  });

  // ── 5. Write a LeadActivity (audit log entry) ───────────────────────────
  const activity = await db.leadActivity.create({
    data: {
      leadId: testLead.id,
      type: "NOTE",
      message: "DB write verification test entry",
    },
  });
  results.push({
    check: "Write LeadActivity (audit entry)",
    status: activity?.id ? "PASS" : "FAIL",
    detail: `Activity ID: ${activity.id}`,
  });

  // ── 6. Read activity back ───────────────────────────────────────────────
  const activityBack = await db.leadActivity.findUnique({ where: { id: activity.id } });
  results.push({
    check: "Read back audit activity",
    status: activityBack?.message === "DB write verification test entry" ? "PASS" : "FAIL",
    detail: activityBack ? `✓ message matches` : "NOT FOUND",
  });

  // ── 7. Update the lead and verify updated_at changes ────────────────────
  const before = readBack!.updatedAt;
  await new Promise((r) => setTimeout(r, 50));
  const updated = await db.lead.update({
    where: { id: testLead.id },
    data: { notes: "update-verify" },
  });
  results.push({
    check: "Update persists (updatedAt advances)",
    status: updated.updatedAt > before ? "PASS" : "FAIL",
    detail: `${before.toISOString()} → ${updated.updatedAt.toISOString()}`,
  });

  // ── 8. Check BookingActivity table is accessible ─────────────────────────
  const bookingActivityCount = await db.bookingActivity.count();
  results.push({
    check: "BookingActivity table readable",
    status: "PASS",
    detail: `${bookingActivityCount} activity rows`,
  });

  // ── 9. Check AuditLog table ──────────────────────────────────────────────
  const auditLogCount = await db.auditLog.count();
  results.push({
    check: "AuditLog table readable",
    status: "PASS",
    detail: `${auditLogCount} audit log entries`,
  });

  // ── 10. Cleanup test data ────────────────────────────────────────────────
  await db.leadActivity.delete({ where: { id: activity.id } });
  await db.lead.delete({ where: { id: testLead.id } });
  const gone = await db.lead.findUnique({ where: { id: testLead.id } });
  results.push({
    check: "Cleanup test data",
    status: gone === null ? "PASS" : "FAIL",
    detail: gone === null ? "Test records deleted successfully" : "STILL EXISTS",
  });

  // ── Print results ────────────────────────────────────────────────────────
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(`${"CHECK".padEnd(45)} ${"STATUS".padEnd(8)} DETAIL`);
  console.log("─".repeat(100));
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`${icon}  ${pad(r.check, 43)} ${pad(r.status, 8)} ${r.detail}`);
  }

  const failed = results.filter((r) => r.status === "FAIL");
  console.log("\n" + "─".repeat(100));
  if (failed.length === 0) {
    console.log(`\n✅  ALL ${results.length} DB CHECKS PASSED — Supabase is writing, reading, and persisting correctly.\n`);
  } else {
    console.log(`\n❌  ${failed.length} CHECK(S) FAILED:\n`);
    for (const f of failed) console.log(`   • ${f.check}: ${f.detail}`);
  }
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(() => db.$disconnect());
