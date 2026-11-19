import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, BookingStatus, LeadStatus, PaymentKind, PaymentMode, ExpenseCategory, CapitalKind, UserRole } from "@/generated/prisma/client";
import type { TransformResult } from "./transform";

const schema = "import_scratch";
function scratchClient() {
  const raw = process.env.DIRECT_URL;
  if (!raw) throw new Error("DIRECT_URL is required.");
  const url = new URL(raw); 
  url.searchParams.set("schema", schema);
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
}

const leadStatus: Record<string, LeadStatus> = { New: "NEW", Contacted: "CONTACTED", Quoted: "QUOTED", "Follow Up": "FOLLOW_UP", Won: "WON", Lost: "LOST", Postponed: "POSTPONED" };

function deterministicId(prefix: string, sourceRef: string): string {
  const hash = crypto.createHash("sha256").update(`${prefix}:${sourceRef}`).digest("hex");
  return `${prefix}_${hash.slice(0, 24)}`;
}

export async function loadImport(data: TransformResult, fileSha256: string, decisions: Record<string, unknown>) {
  const db = scratchClient();
  const startTime = Date.now();
  let queryCount = 0;

  async function countQuery<T>(fn: () => Promise<T>): Promise<T> {
    queryCount++;
    return await fn();
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const tableTimings: Record<string, number> = {};

      // 1. User
      const t0 = Date.now();
      const partnerEmail = "import-holding@example.test";
      const partnerId = deterministicId("usr", partnerEmail);
      
      const existingPartner = await countQuery(() => tx.user.findUnique({ where: { email: partnerEmail } }));
      if (!existingPartner) {
        await countQuery(() => tx.user.create({
          data: { id: partnerId, name: "Import Holding Partner", email: partnerEmail, role: UserRole.PARTNER }
        }));
      }
      tableTimings["partner"] = Date.now() - t0;
      console.log(`[Import Progress] Partner processed in ${tableTimings["partner"]}ms`);

      // 2. Leads
      const tLeads = Date.now();
      const uniqueLeadsMap = new Map<string, typeof data.leads[0]>();
      for (const lead of data.leads) {
        if (!uniqueLeadsMap.has(lead.sourceRef)) {
          uniqueLeadsMap.set(lead.sourceRef, lead);
        }
      }
      const leadsList = Array.from(uniqueLeadsMap.values());

      const existingLeads = await countQuery(() => tx.lead.findMany({
        select: { id: true, code: true, sourceRef: true, clientName: true, phone: true, city: true, eventType: true, targetDate: true, quotedAmount: true, notes: true, status: true }
      }));
      const existingLeadsByCode = new Map(existingLeads.map(l => [l.code, l]));

      const leadCreates: Prisma.LeadCreateManyInput[] = [];
      const leadUpdates: { id: string; data: Prisma.LeadUpdateInput }[] = [];

      for (const lead of leadsList) {
        const id = deterministicId("lead", lead.sourceRef);
        const code = lead.sourceRef;
        const sourceRefVal = `Leads & CRM!${lead.sourceRef}`;
        const clientName = lead.name || "Needs review";
        const phone = lead.phone || "0000000000";
        const city = lead.city;
        const eventType = lead.eventType;
        const targetDate = lead.targetDate;
        const quotedAmount = lead.estimatedAmount;
        const notes = lead.notes;
        const status = leadStatus[lead.status] ?? "NEW";

        const existing = existingLeadsByCode.get(code);
        if (!existing) {
          leadCreates.push({
            id,
            code,
            sourceRef: sourceRefVal,
            clientName,
            phone,
            city,
            eventType,
            targetDate,
            quotedAmount,
            notes,
            status,
          });
        } else {
          if (
            existing.sourceRef !== sourceRefVal ||
            existing.clientName !== clientName ||
            existing.phone !== phone ||
            existing.city !== city ||
            existing.eventType !== eventType ||
            existing.status !== status
          ) {
            leadUpdates.push({
              id: existing.id,
              data: { sourceRef: sourceRefVal, clientName, phone, city, eventType, targetDate, quotedAmount, notes, status }
            });
          }
        }
      }

      if (leadCreates.length > 0) {
        await countQuery(() => tx.lead.createMany({ data: leadCreates, skipDuplicates: true }));
      }
      for (const u of leadUpdates) {
        await countQuery(() => tx.lead.update({ where: { id: u.id }, data: u.data }));
      }
      tableTimings["leads"] = Date.now() - tLeads;
      console.log(`[Import Progress] Leads processed (${leadCreates.length} created, ${leadUpdates.length} updated) in ${tableTimings["leads"]}ms`);

      // 3. Bookings
      const tBookings = Date.now();
      const validBookings = data.bookings.filter((row) => !row._cancelled && row.eventDate && row.basePrice !== null);
      
      const existingBookings = await countQuery(() => tx.booking.findMany({
        select: { id: true, sourceRef: true, clientName: true, basePrice: true, eventDate: true }
      }));
      const existingBookingsByRef = new Map(existingBookings.map(b => [b.sourceRef, b]));

      const allLeadsForBooking = await countQuery(() => tx.lead.findMany({ select: { id: true, code: true } }));
      const leadCodeToId = new Map(allLeadsForBooking.map(l => [l.code, l.id]));

      const bookingCreates: Prisma.BookingCreateManyInput[] = [];
      const bookingUpdates: { id: string; data: Prisma.BookingUpdateInput }[] = [];

      for (const booking of validBookings) {
        const sourceRef = `MasterBookings!${booking.sourceRef}`;
        const id = deterministicId("bk", booking.sourceRef);
        const leadId = booking.enqRef ? leadCodeToId.get(booking.enqRef) : undefined;
        const clientName = booking.name || "Needs review";
        const phone = booking.phone || "0000000000";
        const city = booking.city;
        const venue = booking.venue;
        const eventDate = booking.eventDate!;
        const packageName = booking.packageName ?? "Imported package";
        const basePrice = booking.basePrice!;
        const travelCharge = booking.travelCost ?? 0;
        const discount = booking.discount ?? 0;
        const status = "CONFIRMED" as BookingStatus;

        const existing = existingBookingsByRef.get(sourceRef);
        if (!existing) {
          bookingCreates.push({
            id,
            code: booking.sourceRef,
            sourceRef,
            leadId,
            clientName,
            phone,
            city,
            venue,
            eventDate,
            packageName,
            basePrice,
            travelCharge,
            discount,
            status,
          });
        } else {
          if (existing.clientName !== clientName || existing.basePrice !== basePrice) {
            bookingUpdates.push({
              id: existing.id,
              data: {
                lead: leadId ? { connect: { id: leadId } } : undefined,
                clientName,
                phone,
                city,
                venue,
                eventDate,
                packageName,
                basePrice,
                travelCharge,
                discount,
                status,
              }
            });
          }
        }
      }

      if (bookingCreates.length > 0) {
        await countQuery(() => tx.booking.createMany({ data: bookingCreates, skipDuplicates: true }));
      }
      for (const u of bookingUpdates) {
        await countQuery(() => tx.booking.update({ where: { id: u.id }, data: u.data }));
      }
      tableTimings["bookings"] = Date.now() - tBookings;
      console.log(`[Import Progress] Bookings processed (${bookingCreates.length} created, ${bookingUpdates.length} updated) in ${tableTimings["bookings"]}ms`);

      const allBookingsForRef = await countQuery(() => tx.booking.findMany({ select: { id: true, sourceRef: true, eventDate: true } }));
      const bookingRefToDetails = new Map(allBookingsForRef.map(b => [b.sourceRef, b]));

      // 4. Payments
      const tPayments = Date.now();
      const existingPayments = await countQuery(() => tx.payment.findMany({ select: { id: true, sourceRef: true, amount: true } }));
      const existingPaymentsByRef = new Map(existingPayments.map(p => [p.sourceRef, p]));

      const paymentCreates: Prisma.PaymentCreateManyInput[] = [];
      const paymentUpdates: { id: string; data: Prisma.PaymentUpdateInput }[] = [];

      for (const payment of data.payments) {
        const sourceRef = `MasterBookings!${payment.sourceRef}`;
        const id = deterministicId("pay", payment.sourceRef);
        const bookingDetails = bookingRefToDetails.get(`MasterBookings!${payment.bookingSourceRef}`);
        if (!bookingDetails) continue;
        const bookingId = bookingDetails.id;
        const amount = payment.amount;
        const kind = payment.type as PaymentKind;
        const mode = PaymentMode.CASH;
        const paidOn = bookingDetails.eventDate;

        const existing = existingPaymentsByRef.get(sourceRef);
        if (!existing) {
          paymentCreates.push({
            id,
            sourceRef,
            bookingId,
            amount,
            paidOn,
            kind,
            mode,
          });
        } else {
          if (existing.amount !== amount) {
            paymentUpdates.push({
              id: existing.id,
              data: {
                booking: { connect: { id: bookingId } },
                amount,
                paidOn,
                kind,
                mode,
              }
            });
          }
        }
      }

      if (paymentCreates.length > 0) {
        await countQuery(() => tx.payment.createMany({ data: paymentCreates, skipDuplicates: true }));
      }
      for (const u of paymentUpdates) {
        await countQuery(() => tx.payment.update({ where: { id: u.id }, data: u.data }));
      }
      tableTimings["payments"] = Date.now() - tPayments;
      console.log(`[Import Progress] Payments processed (${paymentCreates.length} created, ${paymentUpdates.length} updated) in ${tableTimings["payments"]}ms`);

      // 5. Expenses
      const tExpenses = Date.now();
      const validExpenses = data.expenses.filter((row) => row.amount !== null && row.date);
      const existingExpenses = await countQuery(() => tx.expense.findMany({ select: { id: true, sourceRef: true, amount: true } }));
      const existingExpensesByRef = new Map(existingExpenses.map(e => [e.sourceRef, e]));

      const expenseCreates: Prisma.ExpenseCreateManyInput[] = [];
      const expenseUpdates: { id: string; data: Prisma.ExpenseUpdateInput }[] = [];

      for (const expense of validExpenses) {
        const sourceRef = `Expenditures!${expense.sourceRef}`;
        const id = deterministicId("exp", expense.sourceRef);
        const bookingDetails = expense.linkedBookingRef ? bookingRefToDetails.get(`MasterBookings!${expense.linkedBookingRef}`) : null;
        const bookingId = bookingDetails?.id;
        const amount = expense.amount!;
        const spentOn = expense.date!;
        const category = (expense.category ?? "OTHER") as ExpenseCategory;
        const note = expense.description;

        const existing = existingExpensesByRef.get(sourceRef);
        if (!existing) {
          expenseCreates.push({
            id,
            sourceRef,
            bookingId,
            amount,
            spentOn,
            category,
            note,
          });
        } else {
          if (existing.amount !== amount) {
            expenseUpdates.push({
              id: existing.id,
              data: {
                booking: bookingId ? { connect: { id: bookingId } } : { disconnect: true },
                amount,
                spentOn,
                category,
                note,
              }
            });
          }
        }
      }

      if (expenseCreates.length > 0) {
        await countQuery(() => tx.expense.createMany({ data: expenseCreates, skipDuplicates: true }));
      }
      for (const u of expenseUpdates) {
        await countQuery(() => tx.expense.update({ where: { id: u.id }, data: u.data }));
      }
      tableTimings["expenses"] = Date.now() - tExpenses;
      console.log(`[Import Progress] Expenses processed (${expenseCreates.length} created, ${expenseUpdates.length} updated) in ${tableTimings["expenses"]}ms`);

      // 6. Capital Entries
      const tCapital = Date.now();
      const existingCapital = await countQuery(() => tx.capitalEntry.findMany({ select: { id: true, sourceRef: true, amount: true } }));
      const existingCapitalByRef = new Map(existingCapital.map(c => [c.sourceRef, c]));

      const capitalCreates: Prisma.CapitalEntryCreateManyInput[] = [];
      const capitalUpdates: { id: string; data: Prisma.CapitalEntryUpdateInput }[] = [];

      for (const entry of data.capitalEntries) {
        const sourceRef = `Expenditures!${entry.sourceRef}`;
        const id = deterministicId("cap", entry.sourceRef);
        const amount = entry.amount;
        const date = entry.date ?? new Date();
        const note = entry.description;
        const kind = CapitalKind.WITHDRAWN;

        const existing = existingCapitalByRef.get(sourceRef);
        if (!existing) {
          capitalCreates.push({
            id,
            sourceRef,
            partnerId,
            kind,
            amount,
            date,
            note,
          });
        } else {
          if (existing.amount !== amount) {
            capitalUpdates.push({
              id: existing.id,
              data: {
                partner: { connect: { id: partnerId } },
                kind,
                amount,
                date,
                note,
              }
            });
          }
        }
      }

      if (capitalCreates.length > 0) {
        await countQuery(() => tx.capitalEntry.createMany({ data: capitalCreates, skipDuplicates: true }));
      }
      for (const u of capitalUpdates) {
        await countQuery(() => tx.capitalEntry.update({ where: { id: u.id }, data: u.data }));
      }
      tableTimings["capitalEntries"] = Date.now() - tCapital;
      console.log(`[Import Progress] Capital Entries processed (${capitalCreates.length} created, ${capitalUpdates.length} updated) in ${tableTimings["capitalEntries"]}ms`);

      // 7. Counters
      const tCounters = Date.now();
      const bookingMax = Math.max(0, ...data.bookings.map((row) => Number(row.sourceRef.replace(/\D/g, "")) || 0));
      const leadMax = Math.max(0, ...data.leads.map((row) => Number(row.sourceRef.replace(/\D/g, "")) || 0));
      
      await countQuery(() => tx.counter.upsert({ where: { name: "JB" }, update: { value: bookingMax }, create: { name: "JB", value: bookingMax } }));
      await countQuery(() => tx.counter.upsert({ where: { name: "ENQ" }, update: { value: leadMax }, create: { name: "ENQ", value: leadMax } }));
      tableTimings["counters"] = Date.now() - tCounters;

      // 8. ImportRun
      const tRun = Date.now();
      await countQuery(() => tx.importRun.create({
        data: {
          fileSha256,
          countsJson: { leads: data.leads.length, bookings: data.bookings.length },
          warningsCount: data.warnings.length,
          decisionsJson: decisions as Prisma.InputJsonValue,
          targetHost: "scratch",
        }
      }));
      tableTimings["importRun"] = Date.now() - tRun;

      const totalElapsed = Date.now() - startTime;
      console.log(`[Import Summary] Total queries executed: ${queryCount}. Total elapsed time: ${totalElapsed}ms`);
      console.log("[Import Summary] Per-table timings (ms):", tableTimings);

      return {
        leads: await countQuery(() => tx.lead.count()),
        bookings: await countQuery(() => tx.booking.count()),
        payments: await countQuery(() => tx.payment.count()),
        expenses: await countQuery(() => tx.expense.count()),
        capitalEntries: await countQuery(() => tx.capitalEntry.count()),
        queryCount,
        totalElapsedMs: totalElapsed,
        tableTimings,
      };
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    return result;
  } finally {
    await db.$disconnect();
  }
}
