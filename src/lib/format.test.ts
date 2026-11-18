import { describe, expect, it } from "vitest";
import { formatDate, inr } from "./format";

describe("formatters", () => {
  it("formats whole rupees in Indian notation", () => {
    expect(inr(325500)).toBe("Rs 3,25,500");
  });

  it("formats dates in IST", () => {
    expect(formatDate("2026-01-01T20:00:00.000Z")).toBe("02 Jan 2026");
  });
});
