import { describe, expect, it } from "vitest";
import { parseMonth, parseOverviewFilters } from "./filters";

describe("overview filters and month parsing", () => {
  it("parses valid YYYY-MM and falls back on invalid", () => {
    expect(parseMonth("2026-11")).toBe("2026-11");
    expect(parseMonth("2028-02")).toBe("2028-02");

    // Fallbacks
    const fixedNow = new Date("2026-11-19T08:00:00.000Z"); // 13:30 IST Nov 19 2026
    expect(parseMonth("garbage", fixedNow)).toBe("2026-11");
    expect(parseMonth(null, fixedNow)).toBe("2026-11");
    expect(parseMonth("2026-13", fixedNow)).toBe("2026-11");
  });

  it("parses overview filters with safe defaults", () => {
    expect(parseOverviewFilters({})).toEqual({
      range: "this-month",
      city: undefined,
      from: undefined,
      to: undefined,
    });

    expect(
      parseOverviewFilters({
        range: "last-month",
        city: "Patna",
      })
    ).toEqual({
      range: "last-month",
      city: "Patna",
      from: undefined,
      to: undefined,
    });

    expect(
      parseOverviewFilters({
        range: "invalid-range",
        city: "  Delhi NCR  ",
      })
    ).toEqual({
      range: "this-month",
      city: "Delhi NCR",
      from: undefined,
      to: undefined,
    });
  });
});
