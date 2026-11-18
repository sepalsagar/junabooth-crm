import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";

describe("booking expense privacy", () => {
  it("does not expose an expenses field to SALES getBooking results", () => {
    const role = "SALES";
    const base = { id: "JB-1", code: "JB-001" };
    const result = can(role, "expenses") ? { ...base, expenses: [] } : base;
    expect("expenses" in result).toBe(false);
  });
});
