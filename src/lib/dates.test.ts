import { describe, expect, it } from "vitest";
import {
  endOfTodayIST,
  endOfWeekIST,
  formatDateIST,
  formatDateTimeIST,
  parseISODateIST,
  startOfTodayIST,
  toISODateStringIST,
} from "./dates";

describe("IST Date helpers", () => {
  it("handles the edge case: 23:30 UTC = 05:00 IST next day", () => {
    // 2026-11-19 at 23:30:00 UTC is 2026-11-20 at 05:00:00 IST
    const nowUTC = new Date("2026-11-19T23:30:00.000Z");

    const start = startOfTodayIST(nowUTC);
    // Midnight IST on 2026-11-20 is 2026-11-19T18:30:00.000Z
    expect(start.toISOString()).toBe("2026-11-19T18:30:00.000Z");

    const end = endOfTodayIST(nowUTC);
    // End of day IST on 2026-11-20 is 2026-11-20T18:29:59.999Z
    expect(end.toISOString()).toBe("2026-11-20T18:29:59.999Z");

    // In IST, date format should show 20 Nov 2026
    expect(formatDateIST(nowUTC)).toContain("20");
    expect(formatDateIST(nowUTC)).toContain("Nov");
    expect(formatDateIST(nowUTC)).toContain("2026");

    expect(toISODateStringIST(nowUTC)).toBe("2026-11-20");
  });

  it("calculates start and end of today correctly for normal midday UTC", () => {
    // 2026-06-15T10:00:00.000Z is 15:30 IST on 2026-06-15
    const now = new Date("2026-06-15T10:00:00.000Z");

    const start = startOfTodayIST(now);
    expect(start.toISOString()).toBe("2026-06-14T18:30:00.000Z");

    const end = endOfTodayIST(now);
    expect(end.toISOString()).toBe("2026-06-15T18:29:59.999Z");
  });

  it("calculates endOfWeekIST correctly for Wednesday and Sunday", () => {
    // 2026-11-18 is Wednesday in IST (2026-11-18T06:00:00Z -> 11:30 IST)
    const wednesday = new Date("2026-11-18T06:00:00.000Z");
    const endOfWeekWed = endOfWeekIST(wednesday);
    // End of week should be Sunday 2026-11-22 23:59:59.999 IST -> 2026-11-22T18:29:59.999Z
    expect(endOfWeekWed.toISOString()).toBe("2026-11-22T18:29:59.999Z");

    // Sunday 2026-11-22 in IST (2026-11-22T06:00:00Z)
    const sunday = new Date("2026-11-22T06:00:00.000Z");
    const endOfWeekSun = endOfWeekIST(sunday);
    // Should end that same Sunday
    expect(endOfWeekSun.toISOString()).toBe("2026-11-22T18:29:59.999Z");
  });

  it("formats dates gracefully for null, undefined, and valid inputs", () => {
    expect(formatDateIST(null)).toBe("—");
    expect(formatDateIST(undefined)).toBe("—");
    expect(formatDateIST("invalid")).toBe("—");

    const d = new Date("2026-01-05T00:00:00.000Z");
    expect(formatDateIST(d)).toContain("2026");
    expect(formatDateTimeIST(d)).toContain("2026");
  });

  it("parses ISO YYYY-MM-DD into start of that day IST", () => {
    const parsed = parseISODateIST("2026-11-20");
    expect(parsed?.toISOString()).toBe("2026-11-19T18:30:00.000Z");

    expect(parseISODateIST("bad-date")).toBeNull();
  });
});
