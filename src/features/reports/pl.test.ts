import { describe, expect, it } from "vitest";
import { monthlyPL, type MonthlyPLData } from "./pl";

describe("monthlyPL", () => {
  it("computes revenue, direct costs, overheads, margins and comparison", () => {
    const data: MonthlyPLData = {
      bookings: [
        // Current month: 2026-11
        {
          id: "b1",
          eventDate: "2026-11-15T12:00:00.000Z", // 17:30 IST
          status: "CONFIRMED",
          basePrice: 20000,
          travelCharge: 2000,
          discount: 1000, // total = 21000
          printSize: null,
          printsUsed: null,
          payments: [
            { amount: 10000, kind: "ADVANCE", voidedAt: null },
            { amount: 11000, kind: "FINAL", voidedAt: null },
          ],
          expenses: [
            { category: "OPERATOR_FEE", amount: 2000, voidedAt: null },
            { category: "TRANSPORT", amount: 1000, voidedAt: null },
          ], // directCosts = 3000
        },
        // Another current month booking with consumables estimate
        {
          id: "b2",
          eventDate: "2026-11-20T12:00:00.000Z",
          status: "COMPLETED",
          basePrice: 16000,
          travelCharge: 0,
          discount: 0, // total = 16000
          printSize: "TWO_BY_SIX",
          printsUsed: 100, // consumables estimate = 100 * 928 / 100 = 928
          payments: [{ amount: 16000, kind: "FINAL", voidedAt: null }],
          expenses: [{ category: "FOOD", amount: 500, voidedAt: null }],
          // directCosts = 500 + 928 = 1428
        },
        // Cancelled booking in current month: cancelled in 2026-11
        {
          id: "b3",
          eventDate: "2026-11-25T12:00:00.000Z",
          status: "CANCELLED",
          basePrice: 25000,
          travelCharge: 0,
          discount: 0,
          cancelledAt: "2026-11-10T10:00:00.000Z",
          payments: [
            { amount: 10000, kind: "ADVANCE", voidedAt: null },
            { amount: 4000, kind: "REFUND", voidedAt: null },
          ], // net received = 6000
          expenses: [],
        },

        // Previous month: 2026-10
        {
          id: "b_prev",
          eventDate: "2026-10-15T12:00:00.000Z",
          status: "COMPLETED",
          basePrice: 30000,
          travelCharge: 0,
          discount: 0, // total = 30000
          payments: [{ amount: 30000, kind: "FINAL", voidedAt: null }],
          expenses: [{ category: "OPERATOR_FEE", amount: 3000, voidedAt: null }],
        },
      ],
      unlinkedExpenses: [
        // Current month overheads (spent in 2026-11)
        {
          id: "e1",
          category: "SOFTWARE", // setup group
          amount: 1500,
          spentOn: "2026-11-05T10:00:00.000Z",
          voidedAt: null,
        },
        {
          id: "e2",
          category: "MARKETING", // marketing group
          amount: 4000,
          spentOn: "2026-11-12T10:00:00.000Z",
          voidedAt: null,
        },
        {
          id: "e3",
          category: "ADMIN", // general group
          amount: 1000,
          spentOn: "2026-11-18T10:00:00.000Z",
          voidedAt: null,
        },
        {
          id: "e_void",
          category: "ADMIN",
          amount: 9999,
          spentOn: "2026-11-18T10:00:00.000Z",
          voidedAt: new Date(), // voided, ignored!
        },
        // Previous month overhead (spent in 2026-10)
        {
          id: "e_prev",
          category: "MARKETING",
          amount: 3000,
          spentOn: "2026-10-10T10:00:00.000Z",
          voidedAt: null,
        },
      ],
    };

    const pl = monthlyPL("2026-11", data);

    // Current month expectations:
    // Revenue: 21000 (b1) + 16000 (b2) + 6000 (b3 net cancelled) = 43000
    expect(pl.current.revenue).toBe(43000);
    expect(pl.current.bookingCount).toBe(2);
    expect(pl.current.cancelledCount).toBe(1);

    // Direct costs: 3000 (b1) + 1428 (b2) = 4428
    expect(pl.current.directCosts).toBe(4428);

    // Gross profit: 43000 - 4428 = 38572
    expect(pl.current.grossProfit).toBe(38572);
    // Gross margin: (38572 / 43000) * 100 = 89.7%
    expect(pl.current.grossMargin).toBe(89.7);

    // Overheads: setup 1500 + marketing 4000 + general 1000 = 6500
    expect(pl.current.overheads.setup).toBe(1500);
    expect(pl.current.overheads.marketing).toBe(4000);
    expect(pl.current.overheads.general).toBe(1000);
    expect(pl.current.overheads.total).toBe(6500);

    // Net profit: 38572 - 6500 = 32072
    expect(pl.current.netProfit).toBe(32072);
    // Net margin: (32072 / 43000) * 100 = 74.6%
    expect(pl.current.netMargin).toBe(74.6);

    // Previous month (2026-10):
    // Revenue = 30000, directCosts = 3000, gross = 27000, overheads = 3000, net = 24000
    expect(pl.previous.revenue).toBe(30000);
    expect(pl.previous.netProfit).toBe(24000);

    // Comparison:
    expect(pl.comparison.revenueDiff).toBe(43000 - 30000); // +13000
    expect(pl.comparison.netProfitDiff).toBe(32072 - 24000); // +8072
  });
});
