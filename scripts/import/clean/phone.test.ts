import { describe, it, expect } from "vitest";
import { cleanPhone } from "./phone";

describe("cleanPhone", () => {
  it("accepts valid 10-digit number", () => {
    expect(cleanPhone("9876543210").value).toBe("9876543210");
    expect(cleanPhone("9876543210").needsReview).toBeUndefined();
  });

  it("strips +91 prefix", () => {
    expect(cleanPhone("+919876543210").value).toBe("9876543210");
  });

  it("strips 0091 prefix", () => {
    expect(cleanPhone("00919876543210").value).toBe("9876543210");
  });

  it("strips leading 0 (STD-style)", () => {
    expect(cleanPhone("09876543210").value).toBe("9876543210");
  });

  it("strips spaces and dashes", () => {
    expect(cleanPhone("98765 43210").value).toBe("9876543210");
    expect(cleanPhone("98765-43210").value).toBe("9876543210");
  });

  it("handles Excel number (no leading zero)", () => {
    // Excel stores 9876543210 as a float
    expect(cleanPhone(9876543210).value).toBe("9876543210");
  });

  it("handles float-serialised phone", () => {
    // 9876500001.0 from Excel
    expect(cleanPhone(9876500001.0).value).toBe("9876500001");
  });

  it("flags number starting with 5 as invalid", () => {
    const r = cleanPhone("5876543210");
    expect(r.needsReview).toBe(true);
    expect(r.warning).toMatch(/invalid/);
  });

  it("flags too-short number", () => {
    const r = cleanPhone("987654");
    expect(r.needsReview).toBe(true);
  });

  it("flags blank as needsReview", () => {
    const r = cleanPhone("", "row 5");
    expect(r.needsReview).toBe(true);
    expect(r.warning).toMatch(/blank/);
  });

  it("flags null as needsReview", () => {
    const r = cleanPhone(null, "row 6");
    expect(r.needsReview).toBe(true);
  });
});
