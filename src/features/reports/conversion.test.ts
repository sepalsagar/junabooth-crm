import { describe, expect, it } from "vitest";
import { leadConversion, type LeadForConversion } from "./conversion";

describe("leadConversion", () => {
  it("computes conversion = won / (won + lost) per source, excluding open leads", () => {
    const rows: LeadForConversion[] = [
      { source: "INSTAGRAM", status: "WON" },
      { source: "INSTAGRAM", status: "LOST" },
      { source: "INSTAGRAM", status: "NEW" }, // open, excluded from conversion denominator
      { source: "INSTAGRAM", status: "WON" },
      // INSTAGRAM: 2 won, 1 lost -> won / (won+lost) = 2/3 = 66.7%

      { source: "WEBSITE", status: "WON" },
      { source: "WEBSITE", status: "WON" },
      // WEBSITE: 2 won, 0 lost -> won / (won+lost) = 2/2 = 100%

      { source: "META_AD", status: "CONTACTED" },
      { source: "META_AD", status: "QUOTED" },
      // META_AD: 0 won, 0 lost -> null conversion

      { source: null, status: "LOST" }, // Falls back to OTHER
    ];

    const results = leadConversion(rows);

    const insta = results.find((r) => r.source === "INSTAGRAM");
    expect(insta).toBeDefined();
    expect(insta?.totalLeads).toBe(4);
    expect(insta?.won).toBe(2);
    expect(insta?.lost).toBe(1);
    expect(insta?.open).toBe(1);
    expect(insta?.conversion).toBe(66.7);

    const web = results.find((r) => r.source === "WEBSITE");
    expect(web).toBeDefined();
    expect(web?.totalLeads).toBe(2);
    expect(web?.won).toBe(2);
    expect(web?.lost).toBe(0);
    expect(web?.open).toBe(0);
    expect(web?.conversion).toBe(100.0);

    const meta = results.find((r) => r.source === "META_AD");
    expect(meta).toBeDefined();
    expect(meta?.totalLeads).toBe(2);
    expect(meta?.won).toBe(0);
    expect(meta?.lost).toBe(0);
    expect(meta?.open).toBe(2);
    expect(meta?.conversion).toBeNull();

    const other = results.find((r) => r.source === "OTHER");
    expect(other).toBeDefined();
    expect(other?.lost).toBe(1);
    expect(other?.conversion).toBe(0.0);
  });
});
