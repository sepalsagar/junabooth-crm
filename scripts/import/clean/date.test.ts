import { describe, it, expect } from "vitest";
import { parseDate } from "./date";

describe("parseDate", () => {
  // ── blank / TBD ──────────────────────────────────────────────
  it("returns null for empty string", () => {
    const r = parseDate("");
    expect(r.value).toBeNull();
    expect(r.flags).toContain("blank");
  });

  it("returns null for TBD", () => {
    expect(parseDate("TBD").flags).toContain("tbd");
    expect(parseDate("tbd").value).toBeNull();
    expect(parseDate("N/A").value).toBeNull();
  });

  // ── Excel serial ─────────────────────────────────────────────
  it("parses Excel serial 1 as 1900-01-01 UTC", () => {
    const r = parseDate(1);
    expect(r.value).not.toBeNull();
    expect(r.value!.getUTCFullYear()).toBe(1900);
    expect(r.value!.getUTCMonth()).toBe(0); // January
    expect(r.value!.getUTCDate()).toBe(1);
  });

  it("parses Excel serial 45200 (a known date)", () => {
    // 45200 = 2023-10-07 (verified externally)
    const r = parseDate(45200);
    expect(r.flags).toContain("excel-serial");
    expect(r.value).not.toBeNull();
    const d = r.value!;
    expect(d.getUTCFullYear()).toBe(2023);
  });

  it("flags out-of-range serial", () => {
    const r = parseDate(0);
    expect(r.value).toBeNull();
    expect(r.flags).toContain("bad-serial");
  });

  // ── ISO format ───────────────────────────────────────────────
  it("parses ISO date 2026-11-15", () => {
    const r = parseDate("2026-11-15");
    expect(r.value!.getUTCFullYear()).toBe(2026);
    expect(r.value!.getUTCMonth()).toBe(10); // November
    expect(r.value!.getUTCDate()).toBe(15);
  });

  // ── dd/mm/yyyy ───────────────────────────────────────────────
  it("parses 15/11/2026", () => {
    const r = parseDate("15/11/2026");
    expect(r.value!.getUTCDate()).toBe(15);
    expect(r.value!.getUTCMonth()).toBe(10); // November
    expect(r.value!.getUTCFullYear()).toBe(2026);
  });

  it("flags ambiguous date when day<=12 and month<=12", () => {
    // 10/11/2026: could be Oct-11 or Nov-10
    const r = parseDate("10/11/2026");
    expect(r.flags).toContain("ambiguous-dmy");
  });

  it("does NOT flag ambiguous when day > 12", () => {
    const r = parseDate("15/11/2026");
    expect(r.flags).not.toContain("ambiguous-dmy");
  });

  // ── dd/mm/yy (2-digit year) ──────────────────────────────────
  it("interprets 2-digit year >=50 as 19xx", () => {
    const r = parseDate("01/01/51");
    expect(r.value!.getUTCFullYear()).toBe(1951);
  });

  it("interprets 2-digit year <50 as 20xx", () => {
    const r = parseDate("15/11/26");
    expect(r.value!.getUTCFullYear()).toBe(2026);
  });

  // ── word date ───────────────────────────────────────────────
  it("parses '12 Nov 26' as 2026-11-12", () => {
    const r = parseDate("12 Nov 26");
    expect(r.value!.getUTCFullYear()).toBe(2026);
    expect(r.value!.getUTCMonth()).toBe(10);
    expect(r.value!.getUTCDate()).toBe(12);
    expect(r.flags).toContain("word-date");
  });

  it("parses '12 November 2026' as 2026-11-12", () => {
    const r = parseDate("12 November 2026");
    expect(r.value!.getUTCDate()).toBe(12);
    expect(r.value!.getUTCFullYear()).toBe(2026);
  });

  it("parses '1 Jan 50' as 1950-01-01 (>=50 rule)", () => {
    const r = parseDate("1 Jan 50");
    expect(r.value!.getUTCFullYear()).toBe(1950);
  });

  // ── garbage ─────────────────────────────────────────────────
  it("returns null + warning for unrecognised format", () => {
    const r = parseDate("not-a-date", "ctx");
    expect(r.value).toBeNull();
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.flags).toContain("unrecognised");
  });
});
