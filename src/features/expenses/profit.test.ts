import { describe, expect, it } from "vitest";
import { consumablesEstimate, eventProfit } from "./profit";

describe("eventProfit", () => {
  it("calculates the Cafe Raahi example", () => {
    const result = eventProfit(
      { basePrice: 16000, travelCharge: 0, discount: 0, status: "COMPLETED" },
      [
        { category: "OPERATOR_FEE", amount: 1500 },
        { category: "TRANSPORT", amount: 2500 },
        { category: "FOOD", amount: 800 },
        { category: "VENUE_CUT", amount: 575 },
        { category: "CONSUMABLES", amount: 1000 },
      ],
      []
    );
    expect(result.profit).toBe(9625);
    expect(result.margin).toBe(60);
  });

  it("estimates 220 2x6 prints once", () => {
    expect(consumablesEstimate("TWO_BY_SIX", 220)).toBe(2042);
  });

  it("does not add estimate when live consumables exist", () => {
    const result = eventProfit(
      { basePrice: 16000, travelCharge: 0, discount: 0, status: "COMPLETED", printSize: "TWO_BY_SIX", printsUsed: 220 },
      [{ category: "CONSUMABLES", amount: 1000 }],
      []
    );
    expect(result.consumablesEstimate).toBeNull();
    expect(result.directCosts).toBe(1000);
  });

  it("ignores voided costs", () => {
    const result = eventProfit(
      { basePrice: 16000, travelCharge: 0, discount: 0, status: "COMPLETED" },
      [{ category: "OPERATOR_FEE", amount: 5000, voidedAt: new Date() }],
      []
    );
    expect(result.directCosts).toBe(0);
  });

  it("uses net received revenue for cancelled bookings", () => {
    const result = eventProfit(
      { basePrice: 16000, travelCharge: 0, discount: 0, status: "CANCELLED" },
      [{ category: "TRANSPORT", amount: 500 }],
      [
        { amount: 10000, kind: "ADVANCE" },
        { amount: 2000, kind: "REFUND" },
      ]
    );
    expect(result.revenue).toBe(8000);
  });

  it("returns null margin for zero revenue", () => {
    const result = eventProfit(
      { basePrice: 0, travelCharge: 0, discount: 0, status: "CANCELLED" },
      [],
      []
    );
    expect(result.margin).toBeNull();
  });

  it("returns null estimate for missing prints", () => {
    expect(consumablesEstimate(null, 220)).toBeNull();
    expect(consumablesEstimate("TWO_BY_SIX", null)).toBeNull();
  });
});
