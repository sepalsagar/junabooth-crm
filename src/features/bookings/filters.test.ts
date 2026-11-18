import { describe, expect, it } from "vitest";
import { buildBookingWhere, parseBookingFilters } from "./filters";

describe("Booking Filters", () => {
  it("parses booking searchParams safely with defaults", () => {
    const params = new URLSearchParams(
      "q=Nisha&status=CONFIRMED&status=OPTION&type=PAID&page=2&timeframe=this-week"
    );
    const parsed = parseBookingFilters(params);

    expect(parsed.q).toBe("Nisha");
    expect(parsed.status).toEqual(["CONFIRMED", "OPTION"]);
    expect(parsed.type).toEqual(["PAID"]);
    expect(parsed.page).toBe(2);
    expect(parsed.timeframe).toBe("this-week");
  });

  it("handles garbage query params without crashing", () => {
    const parsed = parseBookingFilters({
      page: "invalid",
      status: "INVALID_STATUS",
      type: "BOGUS_TYPE",
      timeframe: "future",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.status).toEqual([]);
    expect(parsed.type).toEqual([]);
    expect(parsed.timeframe).toBeUndefined();
  });

  it("builds case-insensitive search where clause for client, phone, or code", () => {
    const where = buildBookingWhere({ q: "Nisha" });
    expect(where).toHaveProperty("OR");
    const orClauses = (where as { OR?: unknown[] }).OR;
    expect(orClauses).toEqual(
      expect.arrayContaining([
        { clientName: { contains: "Nisha", mode: "insensitive" } },
        { code: { contains: "Nisha", mode: "insensitive" } },
        { phone: { contains: "Nisha", mode: "insensitive" } },
      ])
    );
  });

  it("incorporates filtered booking ids from aggregated queries", () => {
    const where = buildBookingWhere({ status: ["CONFIRMED"] }, new Date(), [
      "b_1",
      "b_2",
    ]);

    expect(where).toHaveProperty("AND");
    const andClauses = (where as { AND?: Array<Record<string, unknown>> }).AND ?? [];
    const idClause = andClauses.find((c) => "id" in c);
    expect(idClause).toEqual({ id: { in: ["b_1", "b_2"] } });
  });
});
