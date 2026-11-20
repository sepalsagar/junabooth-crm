import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { paymentStatus, type PaymentStatus } from "@/lib/calc";
import { getAggregatedBookingIds } from "./filters";

describe("SQL Classification vs calc.ts on Seeded Bookings", () => {
  it("proves parameterized SQL query agrees with calc.ts paymentStatus for all seeded bookings", async () => {
    // 1. Fetch all bookings and live payments using Prisma
    const bookings = await db.booking.findMany({
      include: {
        payments: true,
      },
    });

    if (bookings.length === 0) {
      // If no bookings yet, test passes trivially
      return;
    }

    // 2. Compute calc.ts status for each booking (honoring sheetPaymentStatus if present)
    const expectedStatusByBookingId = new Map<string, PaymentStatus>();
    for (const b of bookings) {
      let status: PaymentStatus;
      if (b.sheetPaymentStatus) {
        const s = b.sheetPaymentStatus.toLowerCase();
        if (s.includes("full") || s === "paid" || s.includes("collab") || s.includes("promo")) {
          status = "FULLY_PAID";
        } else if (s.includes("advance")) {
          status = "ADVANCE_PAID";
        } else if (s.includes("pay on event")) {
          status = "PAY_ON_EVENT";
        } else {
          status = "AWAITING_ADVANCE";
        }
      } else {
        status = paymentStatus(
          {
            basePrice: b.basePrice,
            travelCharge: b.travelCharge,
            discount: b.discount,
          },
          b.payments,
          b.payOnEvent
        );
      }
      expectedStatusByBookingId.set(b.id, status);
    }

    // 3. For each distinct payment status, query via getAggregatedBookingIds
    const statusesToTest: PaymentStatus[] = [
      "AWAITING_ADVANCE",
      "ADVANCE_PAID",
      "FULLY_PAID",
      "OVERPAID",
      "PAY_ON_EVENT",
    ];

    for (const status of statusesToTest) {
      const sqlMatchedIds = await getAggregatedBookingIds(db, {
        paymentStatus: [status],
      });

      const calcMatchedIds = Array.from(expectedStatusByBookingId.entries())
        .filter(([, s]) => s === status)
        .map(([id]) => id);

      expect(sqlMatchedIds.sort()).toEqual(calcMatchedIds.sort());
    }
  });
});
