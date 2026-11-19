import { describe, it, expect } from "vitest";
import { parseMoney } from "./money";

describe("parseMoney", () => {
  // ── blank / null ─────────────────────────────────────────────
  it("returns null for empty string (blank ≠ zero)", () => {
    expect(parseMoney("").value).toBeNull();
    expect(parseMoney("").warning).toBeUndefined();
  });

  it("returns null for null", () => {
    expect(parseMoney(null).value).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseMoney(undefined).value).toBeNull();
  });

  // ── raw numbers ──────────────────────────────────────────────
  it("rounds floating-point number", () => {
    expect(parseMoney(16000.5).value).toBe(16001);
  });

  it("accepts integer number", () => {
    expect(parseMoney(28000).value).toBe(28000);
  });

  // ── Indian currency strings ──────────────────────────────────
  it("strips Rs. prefix and /- suffix", () => {
    expect(parseMoney("Rs. 16,000/-").value).toBe(16000);
  });

  it("parses Indian grouping 1,45,000", () => {
    expect(parseMoney("1,45,000").value).toBe(145000);
  });

  it("strips ₹ symbol", () => {
    expect(parseMoney("₹20000").value).toBe(20000);
  });

  it("parses 'Rs 28,000'", () => {
    expect(parseMoney("Rs 28,000").value).toBe(28000);
  });

  // ── shorthand ────────────────────────────────────────────────
  it("parses 15k as 15000", () => {
    expect(parseMoney("15k").value).toBe(15000);
  });

  it("parses 1.5L as 150000", () => {
    expect(parseMoney("1.5L").value).toBe(150000);
  });

  it("parses 3.1L as 310000", () => {
    expect(parseMoney("3.1L").value).toBe(310000);
  });

  it("parses 1.25Cr as 12500000", () => {
    expect(parseMoney("1.25Cr").value).toBe(12500000);
  });

  // ── approximate / needs-review ───────────────────────────────
  it("flags 'approx 15k' as needsReview, NOT imported as number", () => {
    const r = parseMoney("approx 15k", "row 42");
    expect(r.value).toBeNull();
    expect(r.needsReview).toBe(true);
    expect(r.warning).toMatch(/approximate/);
  });

  it("flags '~5000' as needsReview", () => {
    const r = parseMoney("~5000");
    expect(r.value).toBeNull();
    expect(r.needsReview).toBe(true);
  });

  // ── garbage ─────────────────────────────────────────────────
  it("returns null + warning for unparseable string", () => {
    const r = parseMoney("till Oct", "row 7");
    expect(r.value).toBeNull();
    expect(r.needsReview).toBe(true);
  });

  it("handles dash (empty cell marker)", () => {
    expect(parseMoney("-").value).toBeNull();
    expect(parseMoney("---").value).toBeNull();
  });
});
