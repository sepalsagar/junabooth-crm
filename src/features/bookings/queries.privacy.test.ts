import { describe, expect, it } from "vitest";
import { attachExpensesForRole } from "@/lib/permissions";

describe("booking expense privacy", () => {
  it("does not expose an expenses field to SALES getBooking results", () => {
    const base = { id: "JB-1", code: "JB-001" };
    const result = attachExpensesForRole("SALES", base, [{ id: "cost-1", amount: 500 }]);
    expect("expenses" in result).toBe(false);
  });
});
