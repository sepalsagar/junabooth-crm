import { describe, expect, it } from "vitest";
import { formatDate, inr, inrCompact } from "./format";

describe("formatters", () => {
  it("formats whole rupees in Indian notation", () => {
    expect(inr(325500)).toBe("Rs 3,25,500");
  });

  it("formats compact Indian rupees", () => {
    expect(inrCompact(310000)).toBe("3.1L");
    expect(inrCompact(12500000)).toBe("1.25Cr");
    expect(inrCompact(10000000)).toBe("1Cr");
    expect(inrCompact(300000)).toBe("3L");
    expect(inrCompact(50000)).toBe("50,000");
    expect(inrCompact(0)).toBe("0");
    expect(inrCompact(-310000)).toBe("-3.1L");
    expect(inrCompact(-12500000)).toBe("-1.25Cr");
  });

  it("formats dates in IST", () => {
    expect(formatDate("2026-01-01T20:00:00.000Z")).toBe("02 Jan 2026");
  });
});
