import { describe, expect, it } from "vitest";
import { amountReceived, balanceDue, bookingTotal, paymentStatus } from "./calc";

const booking = { basePrice: 10000, travelCharge: 1000, discount: 500 };

describe("booking calculations", () => {
  it("calculates a discounted total", () => expect(bookingTotal(booking)).toBe(10500));
  it("reports an advance-only payment", () => {
    const payments = [{ amount: 3000, kind: "ADVANCE" as const }];
    expect(amountReceived(payments)).toBe(3000);
    expect(balanceDue(booking, payments)).toBe(7500);
    expect(paymentStatus(booking, payments)).toBe("ADVANCE_PAID");
  });
  it("reports fully paid", () => {
    const payments = [{ amount: 10500, kind: "FINAL" as const }];
    expect(paymentStatus(booking, payments)).toBe("FULLY_PAID");
  });
  it("subtracts refunds", () => {
    const payments = [
      { amount: 6000, kind: "ADVANCE" as const },
      { amount: 1000, kind: "REFUND" as const },
    ];
    expect(amountReceived(payments)).toBe(5000);
    expect(balanceDue(booking, payments)).toBe(5500);
  });
  it("reports overpaid", () => {
    const payments = [{ amount: 11000, kind: "FINAL" as const }];
    expect(paymentStatus(booking, payments)).toBe("OVERPAID");
  });
  it("reports no payments as awaiting advance", () => {
    expect(paymentStatus(booking, [])).toBe("AWAITING_ADVANCE");
  });
});
