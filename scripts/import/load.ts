import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, BookingStatus, LeadStatus, PaymentKind, PaymentMode, ExpenseCategory, CapitalKind, UserRole } from "@/generated/prisma/client";
import type { TransformResult } from "./transform";

const schema = "import_scratch";
function scratchClient() {
  const raw = process.env.DIRECT_URL;
  if (!raw) throw new Error("DIRECT_URL is required.");
  const url = new URL(raw); url.searchParams.set("schema", schema);
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
}
const leadStatus: Record<string, LeadStatus> = { New: "NEW", Contacted: "CONTACTED", Quoted: "QUOTED", "Follow Up": "FOLLOW_UP", Won: "WON", Lost: "LOST", Postponed: "POSTPONED" };

export async function loadImport(data: TransformResult, fileSha256: string, decisions: Record<string, unknown>) {
  const db = scratchClient();
  try {
    return await db.$transaction(async (tx) => {
      const partner = await tx.user.upsert({ where: { email: "import-holding@example.test" }, update: {}, create: { id: crypto.randomUUID(), name: "Import Holding Partner", email: "import-holding@example.test", role: UserRole.PARTNER } });
      const importedLeadCodes = new Set<string>();
      for (const lead of data.leads) { if (importedLeadCodes.has(lead.sourceRef)) continue; importedLeadCodes.add(lead.sourceRef); await tx.lead.upsert({ where: { code: lead.sourceRef }, update: { sourceRef: `Leads & CRM!${lead.sourceRef}`, clientName: lead.name, phone: lead.phone }, create: { code: lead.sourceRef, sourceRef: `Leads & CRM!${lead.sourceRef}`, clientName: lead.name || "Needs review", phone: lead.phone || "0000000000", city: lead.city, eventType: lead.eventType, targetDate: lead.targetDate, quotedAmount: lead.estimatedAmount, notes: lead.notes, status: leadStatus[lead.status] ?? "NEW" } }); }
      for (const booking of data.bookings.filter((row) => !row._cancelled && row.eventDate && row.basePrice !== null)) {
        const lead = booking.enqRef ? await tx.lead.findFirst({ where: { code: booking.enqRef } }) : null;
        const ref = `MasterBookings!${booking.sourceRef}`;
        await tx.booking.upsert({ where: { sourceRef: ref }, update: { clientName: booking.name }, create: { code: booking.sourceRef, sourceRef: ref, leadId: lead?.id, clientName: booking.name || "Needs review", phone: booking.phone || "0000000000", city: booking.city, venue: booking.venue, eventDate: booking.eventDate!, packageName: booking.packageName ?? "Imported package", basePrice: booking.basePrice!, travelCharge: booking.travelCost ?? 0, discount: booking.discount ?? 0, status: "CONFIRMED" as BookingStatus } });
      }
      for (const payment of data.payments) { const booking = await tx.booking.findFirst({ where: { sourceRef: `MasterBookings!${payment.bookingSourceRef}` } }); if (booking) await tx.payment.upsert({ where: { sourceRef: `MasterBookings!${payment.sourceRef}` }, update: {}, create: { sourceRef: `MasterBookings!${payment.sourceRef}`, bookingId: booking.id, amount: payment.amount, paidOn: booking.eventDate, kind: payment.type as PaymentKind, mode: PaymentMode.CASH } }); }
      for (const expense of data.expenses.filter((row) => row.amount !== null && row.date)) { const booking = expense.linkedBookingRef ? await tx.booking.findFirst({ where: { sourceRef: `MasterBookings!${expense.linkedBookingRef}` } }) : null; await tx.expense.upsert({ where: { sourceRef: `Expenditures!${expense.sourceRef}` }, update: {}, create: { sourceRef: `Expenditures!${expense.sourceRef}`, bookingId: booking?.id, amount: expense.amount!, spentOn: expense.date!, category: (expense.category ?? "OTHER") as ExpenseCategory, note: expense.description } }); }
      for (const entry of data.capitalEntries) await tx.capitalEntry.upsert({ where: { sourceRef: `Expenditures!${entry.sourceRef}` }, update: {}, create: { sourceRef: `Expenditures!${entry.sourceRef}`, partnerId: partner.id, kind: CapitalKind.WITHDRAWN, amount: entry.amount, date: entry.date ?? new Date(), note: entry.description } });
      const bookingMax = Math.max(0, ...data.bookings.map((row) => Number(row.sourceRef.replace(/\D/g, "")) || 0)); const leadMax = Math.max(0, ...data.leads.map((row) => Number(row.sourceRef.replace(/\D/g, "")) || 0));
      await tx.counter.upsert({ where: { name: "JB" }, update: { value: bookingMax }, create: { name: "JB", value: bookingMax } }); await tx.counter.upsert({ where: { name: "ENQ" }, update: { value: leadMax }, create: { name: "ENQ", value: leadMax } });
      await tx.importRun.create({ data: { fileSha256, countsJson: { leads: data.leads.length, bookings: data.bookings.length }, warningsCount: data.warnings.length, decisionsJson: decisions as Prisma.InputJsonValue, targetHost: "scratch" } });
      return { leads: await tx.lead.count(), bookings: await tx.booking.count(), payments: await tx.payment.count(), expenses: await tx.expense.count(), capitalEntries: await tx.capitalEntry.count() };
    });
  } finally { await db.$disconnect(); }
}
