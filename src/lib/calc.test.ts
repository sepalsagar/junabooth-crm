import { describe, expect, it } from "vitest";
import {
  amountReceived,
  balanceDue,
  bookingTotal,
  livePayments,
  paymentStatus,
  paymentStatusLabel,
} from "./calc";

const booking = { basePrice: 10000, travelCharge: 1000, discount: 500 };

describe("booking calculations", () => {
  it("calculates a discounted total", () =>
    expect(bookingTotal(booking)).toBe(10500));

  it("reports an advance-only payment", () => {
    const payments = [{ amount: 3000, kind: "ADVANCE" as const }];
    expect(amountReceived(payments)).toBe(3000);
    expect(balanceDue(booking, payments)).toBe(7500);
    expect(paymentStatus(booking, payments)).toBe("ADVANCE_PAID");
    expect(paymentStatusLabel("ADVANCE_PAID")).toBe("Advance paid");
  });

  it("reports fully paid", () => {
    const payments = [{ amount: 10500, kind: "FINAL" as const }];
    expect(paymentStatus(booking, payments)).toBe("FULLY_PAID");
    expect(paymentStatusLabel("FULLY_PAID")).toBe("Fully paid");
  });

  it("subtracts refunds", () => {
    const payments = [
      { amount: 6000, kind: "ADVANCE" as const },
      { amount: 1000, kind: "REFUND" as const },
    ];
    expect(amountReceived(payments)).toBe(5000);
    expect(balanceDue(booking, payments)).toBe(5500);
  });

  it("ignores voided payments everywhere", () => {
    const payments = [
      { amount: 5000, kind: "ADVANCE" as const },
      {
        amount: 5000,
        kind: "PART" as const,
        voidedAt: new Date("2026-11-18T10:00:00Z"),
      },
      {
        amount: 2000,
        kind: "PART" as const,
        voidedAt: "2026-11-18T11:00:00Z",
      },
    ];

    const live = livePayments(payments);
    expect(live).toHaveLength(1);
    expect(amountReceived(payments)).toBe(5000);
    expect(balanceDue(booking, payments)).toBe(5500);
    expect(paymentStatus(booking, payments)).toBe("ADVANCE_PAID");
  });

  it("reports overpaid", () => {
    const payments = [{ amount: 11000, kind: "FINAL" as const }];
    expect(paymentStatus(booking, payments)).toBe("OVERPAID");
    expect(paymentStatusLabel("OVERPAID")).toBe("Overpaid");
  });

  it("reports no payments as awaiting advance or pay on event", () => {
    expect(paymentStatus(booking, [])).toBe("AWAITING_ADVANCE");
    expect(paymentStatusLabel("AWAITING_ADVANCE")).toBe("Awaiting advance");

    expect(paymentStatus(booking, [], true)).toBe("PAY_ON_EVENT");
    expect(paymentStatusLabel("PAY_ON_EVENT")).toBe("Pay on event");
    expect(paymentStatusLabel("AWAITING_ADVANCE", true)).toBe("Pay on event");
  });
});
