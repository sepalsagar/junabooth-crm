import { describe, expect, it } from "vitest";
import { buildMonthGrid } from "./grid";

describe("buildMonthGrid", () => {
  it("always returns exactly 42 cells", () => {
    const grid = buildMonthGrid(2026, 11);
    expect(grid).toHaveLength(42);
  });

  it("handles Dec 2026 -> Jan 2027 transition", () => {
    // 2026-12-01 is a Tuesday
    // With weekStartsOn=1 (Monday), cell 0 is Monday 2026-11-30 (inMonth: false)
    // Cell 1 is 2026-12-01 (inMonth: true)
    // Dec has 31 days (ending Thursday 2026-12-31, cell 31)
    // Jan 2027 fills cells 32 to 41 (inMonth: false)
    const grid = buildMonthGrid(2026, 12, 1);
    expect(grid).toHaveLength(42);
    expect(grid[0].iso).toBe("2026-11-30");
    expect(grid[0].inMonth).toBe(false);

    expect(grid[1].iso).toBe("2026-12-01");
    expect(grid[1].inMonth).toBe(true);

    expect(grid[31].iso).toBe("2026-12-31");
    expect(grid[31].inMonth).toBe(true);

    expect(grid[32].iso).toBe("2027-01-01");
    expect(grid[32].inMonth).toBe(false);

    const inMonthCount = grid.filter((c) => c.inMonth).length;
    expect(inMonthCount).toBe(31);
  });

  it("handles Feb 2028 leap year", () => {
    // 2028 is a leap year; Feb has 29 days
    // 2028-02-01 is a Tuesday
    const grid = buildMonthGrid(2028, 2, 1);
    expect(grid).toHaveLength(42);

    const febCells = grid.filter((c) => c.inMonth);
    expect(febCells).toHaveLength(29);
    expect(febCells[0].iso).toBe("2028-02-01");
    expect(febCells[28].iso).toBe("2028-02-29");
  });

  it("handles month starting on the first column (Monday when weekStartsOn=1)", () => {
    // 2026-06-01 is Monday
    const grid = buildMonthGrid(2026, 6, 1);
    expect(grid).toHaveLength(42);
    expect(grid[0].iso).toBe("2026-06-01");
    expect(grid[0].inMonth).toBe(true);
    expect(grid[0].dayOfWeek).toBe(1); // Monday
  });

  it("handles month starting on the last column (Sunday when weekStartsOn=1)", () => {
    // 2026-11-01 is Sunday
    const grid = buildMonthGrid(2026, 11, 1);
    expect(grid).toHaveLength(42);
    // Cells 0-5 are October 2026
    for (let i = 0; i < 6; i++) {
      expect(grid[i].inMonth).toBe(false);
      expect(grid[i].iso.startsWith("2026-10")).toBe(true);
    }
    // Cell 6 is Sunday 2026-11-01
    expect(grid[6].iso).toBe("2026-11-01");
    expect(grid[6].inMonth).toBe(true);
    expect(grid[6].dayOfWeek).toBe(0); // Sunday
  });
});
