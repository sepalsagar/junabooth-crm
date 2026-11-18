import { describe, expect, it } from "vitest";
import { canMove, isBelowRate, validatePayment } from "./rules";

describe("Booking Rules & State Machine", () => {
  describe("canMove state transitions", () => {
    it("allows valid transitions", () => {
      expect(canMove("OPTION", "CONFIRMED")).toBe(true);
      expect(canMove("OPTION", "CANCELLED")).toBe(true);
      expect(canMove("CONFIRMED", "IN_PROGRESS")).toBe(true);
      expect(canMove("CONFIRMED", "POSTPONED")).toBe(true);
      expect(canMove("CONFIRMED", "CANCELLED")).toBe(true);
      expect(canMove("IN_PROGRESS", "COMPLETED")).toBe(true);
      expect(canMove("IN_PROGRESS", "CANCELLED")).toBe(true);
      expect(canMove("POSTPONED", "CONFIRMED")).toBe(true);
      expect(canMove("POSTPONED", "CANCELLED")).toBe(true);
    });

    it("rejects illegal transitions", () => {
      expect(canMove("OPTION", "COMPLETED")).toBe(false);
      expect(canMove("OPTION", "IN_PROGRESS")).toBe(false);
      expect(canMove("COMPLETED", "CONFIRMED")).toBe(false);
      expect(canMove("COMPLETED", "CANCELLED")).toBe(false);
      expect(canMove("CANCELLED", "CONFIRMED")).toBe(false);
      expect(canMove("CANCELLED", "OPTION")).toBe(false);
      expect(canMove("CONFIRMED", "CONFIRMED")).toBe(false);
    });
  });

  describe("isBelowRate helper", () => {
    it("flags basePrice discounted below package price", () => {
      const pkg = { name: "Classic", price: 16000 };
      expect(isBelowRate(15000, pkg)).toBe(true);
      expect(isBelowRate(16000, pkg)).toBe(false);
      expect(isBelowRate(18000, pkg)).toBe(false);

      const customPkg = { name: "Custom", price: 0 };
      expect(isBelowRate(5000, customPkg)).toBe(false);
      expect(isBelowRate(5000, null)).toBe(false);
    });
  });

  describe("validatePayment", () => {
    const booking = { basePrice: 20000, travelCharge: 2000, discount: 1000 }; // total: 21000
    const now = new Date("2026-11-20T12:00:00.000Z");

    it("rejects invalid amounts and missing required fields", () => {
      const res = validatePayment(
        {
          amount: -500,
          paidOn: now,
          mode: "UPI",
          receivedBy: "",
        },
        booking,
        [],
        now
      );

      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errors.amount).toBeDefined();
        expect(res.errors.receivedBy).toBeDefined();
      }
    });

    it("rejects future dates", () => {
      const futureDate = new Date(now.getTime() + 2 * 86_400_000);
      const res = validatePayment(
        {
          amount: 5000,
          paidOn: futureDate,
          mode: "UPI",
          receivedBy: "Partner 1",
        },
        booking,
        [],
        now
      );

      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errors.paidOn).toBeDefined();
      }
    });

    it("accepts valid payment and issues overpayment warning when exceeded", () => {
      const existing = [{ amount: 15000, kind: "ADVANCE" as const, paidOn: now }];
      const res = validatePayment(
        {
          amount: 10000, // 15000 + 10000 = 25000 > 21000
          paidOn: now,
          mode: "BANK",
          receivedBy: "Partner 1",
        },
        booking,
        existing,
        now
      );

      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.warnings).toHaveLength(1);
        expect(res.warnings[0]).toContain("overpayment of ₹4,000");
      }
    });

    it("issues likely-duplicate warning for same amount within 5 minutes", () => {
      const threeMinAgo = new Date(now.getTime() - 3 * 60 * 1000);
      const existing = [
        {
          amount: 5000,
          kind: "ADVANCE" as const,
          paidOn: threeMinAgo,
        },
      ];

      const res = validatePayment(
        {
          amount: 5000,
          paidOn: now,
          mode: "UPI",
          receivedBy: "Partner 1",
        },
        booking,
        existing,
        now
      );

      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.warnings.some((w) => w.includes("within 5 minutes"))).toBe(true);
      }
    });
  });
});
