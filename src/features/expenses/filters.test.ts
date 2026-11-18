import { describe, expect, it } from "vitest";
import { buildExpenseWhere, parseExpenseFilters } from "./filters";

describe("expense filters", () => {
  it("treats garbage input safely", () => {
    expect(parseExpenseFilters({ category: "garbage", page: "nope", includeVoided: "maybe" })).toEqual({ page: 1, includeVoided: false });
  });

  it("counts 19:00 UTC on Nov 30 in December IST", () => {
    const now = new Date("2025-12-01T12:00:00Z");
    const monthEnd = new Date("2025-11-30T19:00:00Z");
    const where = buildExpenseWhere(parseExpenseFilters({ timeframe: "this-month" }), now);
    const range = where.spentOn as { gte: Date; lte: Date };
    expect(monthEnd >= range.gte && monthEnd <= range.lte).toBe(true);
  });

  it("builds a linked category filter", () => {
    const where = buildExpenseWhere({ page: 1, includeVoided: false, group: "event-day", linked: "linked" });
    expect(where.bookingId).toEqual({ not: null });
  });
});
