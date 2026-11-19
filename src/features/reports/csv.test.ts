import { describe, expect, it } from "vitest";
import { csvCell, toCSVRow } from "./csv";

describe("csvCell and toCSVRow", () => {
  it("quotes and escapes commas, double quotes, and newlines", () => {
    expect(csvCell("Patna, Bihar")).toBe('"Patna, Bihar"');
    expect(csvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    expect(csvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    expect(csvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
  });

  it("neutralises spreadsheet formulas by prepending an apostrophe", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+919876543210")).toBe("'+919876543210");
    expect(csvCell("-500")).toBe("'-500");
    expect(csvCell("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
    expect(csvCell("\tTabbed")).toBe("'\tTabbed");
  });

  it("handles formulas that also contain commas or quotes", () => {
    expect(csvCell("=SUM(A1, B1)")).toBe('"\'=SUM(A1, B1)"');
  });

  it("handles numbers and nullish values", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(12500)).toBe("12500");
    expect(csvCell(0)).toBe("0");
    expect(csvCell(-250)).toBe("'-250");
  });

  it("formats a full row correctly", () => {
    const row = toCSVRow(["ENQ-001", "Aarav, Mehta", "=1+1", 25000]);
    expect(row).toBe('ENQ-001,"Aarav, Mehta",\'=1+1,25000');
  });
});
