import { describe, expect, it } from "vitest";
import { likelyDuplicate, validateExpense, validateReceiptFile } from "./rules";

describe("expense rules", () => {
  it("accepts valid expense and rejects future dates", () => {
    expect(validateExpense({ category: "TRANSPORT", amount: 500, spentOn: "2026-11-18" }, new Date("2026-11-19T12:00:00Z")).ok).toBe(true);
    expect(validateExpense({ category: "TRANSPORT", amount: 500, spentOn: "2026-11-20" }, new Date("2026-11-19T12:00:00Z")).ok).toBe(false);
  });

  it("detects likely duplicates", () => {
    expect(likelyDuplicate(
      { amount: 500, category: "FOOD", spentOn: new Date("2026-11-18T00:00:00Z"), paidBy: "Asha" },
      [{ amount: 500, category: "FOOD", spentOn: new Date("2026-11-18T12:00:00Z"), paidBy: "Asha" }]
    )).toBe(true);
  });

  it("rejects invalid receipt types and sizes", () => {
    expect(validateReceiptFile({ type: "image/jpeg", size: 1024 }).ok).toBe(true);
    expect(validateReceiptFile({ type: "text/plain", size: 1024 }).ok).toBe(false);
    expect(validateReceiptFile({ type: "image/jpeg", size: 12 * 1024 * 1024 }).ok).toBe(false);
  });
});
