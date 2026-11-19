import { describe, it, expect } from "vitest";
import { parseSheetStatus, canonicalCity, guessCategory } from "./maps";

describe("parseSheetStatus", () => {
  it("maps 'Paid' → FULLY_PAID", () => {
    expect(parseSheetStatus("Paid")).toBe("FULLY_PAID");
  });

  it("maps 'Fully Paid' → FULLY_PAID", () => {
    expect(parseSheetStatus("Fully Paid")).toBe("FULLY_PAID");
  });

  it("maps 'Advance Paid' → ADVANCE_PAID", () => {
    expect(parseSheetStatus("Advance Paid")).toBe("ADVANCE_PAID");
  });

  it("maps 'pending' → UNPAID", () => {
    expect(parseSheetStatus("pending")).toBe("UNPAID");
  });

  it("maps null → UNKNOWN", () => {
    expect(parseSheetStatus(null)).toBe("UNKNOWN");
  });

  it("maps unknown string → UNKNOWN", () => {
    expect(parseSheetStatus("whatever")).toBe("UNKNOWN");
  });
});

describe("canonicalCity", () => {
  it("maps Bangalore → Bengaluru", () => {
    expect(canonicalCity("Bangalore")).toBe("Bengaluru");
  });

  it("maps MYSORE → Mysuru (case-insensitive)", () => {
    expect(canonicalCity("MYSORE")).toBe("Mysuru");
  });

  it("returns original for unknown city", () => {
    expect(canonicalCity("Coorg")).toBe("Coorg");
  });

  it("returns null for empty", () => {
    expect(canonicalCity("")).toBeNull();
    expect(canonicalCity(null)).toBeNull();
  });
});

describe("guessCategory", () => {
  it("maps 'cab fare to venue' → TRAVEL", () => {
    expect(guessCategory("cab fare to venue")).toBe("TRAVEL");
  });

  it("maps 'lunch for team' → FOOD", () => {
    expect(guessCategory("lunch for team")).toBe("FOOD");
  });

  it("maps 'camera battery' → EQUIPMENT", () => {
    expect(guessCategory("camera battery replacement")).toBe("EQUIPMENT");
  });

  it("returns null for unrecognised", () => {
    expect(guessCategory("xyz zzy")).toBeNull();
  });

  it("returns null for blank", () => {
    expect(guessCategory("")).toBeNull();
    expect(guessCategory(null)).toBeNull();
  });
});
