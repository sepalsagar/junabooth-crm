import { describe, expect, it } from "vitest";
import { fillMonths, monthsBetween } from "./months";

describe("monthsBetween and fillMonths", () => {
  it("generates month ranges between two YYYY-MM strings", () => {
    expect(monthsBetween("2026-08", "2026-11")).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);

    expect(monthsBetween("2026-11", "2027-02")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);

    expect(monthsBetween("2026-11", "2026-11")).toEqual(["2026-11"]);
  });

  it("zero-fills missing months using default generator", () => {
    const rows = [
      { month: "2026-08", completed: 100, upcoming: 50 },
      { month: "2026-10", completed: 200, upcoming: 0 },
    ];

    const filled = fillMonths(rows, "2026-08", "2026-11", (m) => ({
      month: m,
      completed: 0,
      upcoming: 0,
    }));

    expect(filled).toHaveLength(4);
    expect(filled[0]).toEqual({ month: "2026-08", completed: 100, upcoming: 50 });
    expect(filled[1]).toEqual({ month: "2026-09", completed: 0, upcoming: 0 }); // zero-filled
    expect(filled[2]).toEqual({ month: "2026-10", completed: 200, upcoming: 0 });
    expect(filled[3]).toEqual({ month: "2026-11", completed: 0, upcoming: 0 }); // zero-filled
  });
});
