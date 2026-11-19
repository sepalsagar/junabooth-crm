import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  getBalanceToCollect,
  getCashInputs,
  getMonthlyPLData,
} from "./queries";
import { getActiveBookingFinancials } from "@/features/bookings/queries";
import { amountReceived, balanceDue, bookingTotal } from "@/lib/calc";
import { toISODateStringIST } from "@/lib/dates";

describe("Metrics Consistency on Seed Data", () => {
  it("Overview balance-to-collect equals sum of all active booking balances", async () => {
    const overviewBalance = await getBalanceToCollect();

    const activeRows = await getActiveBookingFinancials();
    let manualSum = 0;
    for (const b of activeRows) {
      const bal = balanceDue(b, b.payments);
      if (bal > 0) manualSum += bal;
    }

    expect(overviewBalance).toBe(manualSum);
  });

  it("P&L revenue for a month equals sum of booking totals for it", async () => {
    const month = "2026-11";
    const pl = await getMonthlyPLData(month);

    // Manual calculation of revenue for 2026-11
    const allBookings = await db.booking.findMany({
      select: {
        eventDate: true,
        status: true,
        basePrice: true,
        travelCharge: true,
        discount: true,
        updatedAt: true,
        payments: {
          select: {
            amount: true,
            kind: true,
            voidedAt: true,
          },
        },
      },
    });

    let manualRevenue = 0;
    for (const b of allBookings) {
      const eventDateStr = toISODateStringIST(new Date(b.eventDate));
      if (b.status !== "CANCELLED") {
        if (eventDateStr.startsWith(month)) {
          manualRevenue += bookingTotal(b);
        }
      } else {
        const cancelMonth = toISODateStringIST(new Date(b.updatedAt)).slice(0, 7);
        if (cancelMonth === month) {
          manualRevenue += amountReceived(b.payments);
        }
      }
    }

    expect(pl.current.revenue).toBe(manualRevenue);
  });

  it("cash position inputs equal direct database sums of live rows", async () => {
    const inputs = await getCashInputs();

    const [injectedRows, withdrawnRows, livePayments, liveExpenses] =
      await Promise.all([
        db.capitalEntry.findMany({
          where: { kind: "INJECTED", voidedAt: null },
          select: { amount: true },
        }),
        db.capitalEntry.findMany({
          where: { kind: "WITHDRAWN", voidedAt: null },
          select: { amount: true },
        }),
        db.payment.findMany({
          where: { voidedAt: null },
          select: { amount: true, kind: true },
        }),
        db.expense.findMany({
          where: { voidedAt: null },
          select: { amount: true },
        }),
      ]);

    const manualInjected = injectedRows.reduce((sum, r) => sum + r.amount, 0);
    const manualWithdrawn = withdrawnRows.reduce((sum, r) => sum + r.amount, 0);
    const manualExpenses = liveExpenses.reduce((sum, r) => sum + r.amount, 0);
    let manualReceived = 0;
    for (const p of livePayments) {
      manualReceived += p.kind === "REFUND" ? -p.amount : p.amount;
    }

    expect(inputs.injected).toBe(manualInjected);
    expect(inputs.withdrawn).toBe(manualWithdrawn);
    expect(inputs.expenses).toBe(manualExpenses);
    expect(inputs.received).toBe(manualReceived);
  });
});
