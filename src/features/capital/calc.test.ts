import { describe, expect, it } from "vitest";
import { capitalShare, cashPosition } from "./calc";

describe("cashPosition and capitalShare", () => {
  it("computes cashPosition = injected + received - expenses - withdrawn", () => {
    const result = cashPosition({
      injected: 100000,
      received: 75000,
      expenses: 30000,
      withdrawn: 15000,
    });

    expect(result.injected).toBe(100000);
    expect(result.received).toBe(75000);
    expect(result.expenses).toBe(30000);
    expect(result.withdrawn).toBe(15000);
    expect(result.total).toBe(130000); // 100000 + 75000 - 30000 - 15000
  });

  it("computes capitalShare with one decimal, returns 0.0 for partnerNet <= 0, or null when positiveTotalNet <= 0", () => {
    expect(capitalShare(50000, 100000)).toBe(50.0);
    expect(capitalShare(33333, 100000)).toBe(33.3);
    expect(capitalShare(66667, 100000)).toBe(66.7);
    expect(capitalShare(0, 100000)).toBe(0.0);
    expect(capitalShare(-5000, 100000)).toBe(0.0);
    expect(capitalShare(10000, 0)).toBeNull();
    expect(capitalShare(10000, -5000)).toBeNull();
  });

  it("handles negative partner net by excluding from positive pool so remaining partners sum to 100%", () => {
    const partners = [
      { name: "A", net: 100000 },
      { name: "B", net: 100000 },
      { name: "C", net: -20000 },
    ];
    const positivePool = partners.filter((p) => p.net > 0).reduce((s, p) => s + p.net, 0); // 200,000
    const shares = partners.map((p) => capitalShare(p.net, positivePool));
    expect(shares[0]).toBe(50.0);
    expect(shares[1]).toBe(50.0);
    expect(shares[2]).toBe(0.0);
    expect(shares.reduce((s: number, sh) => s + (sh ?? 0), 0)).toBe(100.0);
  });
});
