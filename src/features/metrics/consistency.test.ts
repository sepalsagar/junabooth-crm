import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  getBalanceToCollect,
  getCashInputs,
  getCashPosition,
  getMonthlyPLData,
} from "./queries";
import { getFirmCapitalSummary, getPartnersCapitalData } from "@/features/capital/queries";
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

  it("partner capital reconciliation: sums of partner rows match firm totals and shares sum to 100%", async () => {
    const [capSummary, partnersData, cashInputs, cashPos] = await Promise.all([
      getFirmCapitalSummary(),
      getPartnersCapitalData(),
      getCashInputs(),
      getCashPosition(),
    ]);

    // 1. sum of partner injected == firm injected
    const sumPartnerInjected = capSummary.partners.reduce((s, p) => s + p.injected, 0);
    expect(sumPartnerInjected).toBe(capSummary.firmInjected);
    expect(partnersData.partners.reduce((s, p) => s + p.injected, 0)).toBe(capSummary.firmInjected);

    // 2. sum of partner withdrawn == firm withdrawn
    const sumPartnerWithdrawn = capSummary.partners.reduce((s, p) => s + p.withdrawn, 0);
    expect(sumPartnerWithdrawn).toBe(capSummary.firmWithdrawn);
    expect(partnersData.partners.reduce((s, p) => s + p.withdrawn, 0)).toBe(capSummary.firmWithdrawn);

    // 3. shares of positive nets sum to 100% within 0.1 * number of partners
    const positivePartners = capSummary.partners.filter((p) => p.net > 0);
    expect(positivePartners.length).toBeGreaterThan(0);

    const sumShares = capSummary.partners.reduce((s, p) => s + (p.share ?? 0), 0);
    const maxTolerance = 0.1 * capSummary.partners.length; // e.g. 0.4% for 4 partners due to 1-decimal rounding
    expect(Math.abs(sumShares - 100.0)).toBeLessThanOrEqual(maxTolerance);

    // 4. cashPosition inputs == sums of partner rows
    expect(cashInputs.injected).toBe(sumPartnerInjected);
    expect(cashInputs.withdrawn).toBe(sumPartnerWithdrawn);
    expect(cashPos.injected).toBe(sumPartnerInjected);
    expect(cashPos.withdrawn).toBe(sumPartnerWithdrawn);

    // Total net equity equals firm-wide card net
    const sumPartnerNet = capSummary.partners.reduce((s, p) => s + p.net, 0);
    expect(sumPartnerNet).toBe(capSummary.firmNet);
    expect(partnersData.totalNet).toBe(capSummary.firmNet);
  });
});
