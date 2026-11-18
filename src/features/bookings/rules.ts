import type {
  BookingStatus,
  PaymentKind,
  PaymentMode,
} from "@/generated/prisma/client";
import { amountReceived, bookingTotal, type BookingAmounts, type PaymentAmount } from "@/lib/calc";

// State machine for booking status transitions
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  OPTION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "POSTPONED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  POSTPONED: ["CONFIRMED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canMove(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// Flags if a booking's base price is discounted below package catalog list price
export function isBelowRate(
  basePrice: number,
  pkg?: { price: number; name?: string } | null
): boolean {
  if (!pkg) return false;
  return pkg.price > 0 && basePrice < pkg.price;
}

export type PaymentInput = {
  amount: number;
  paidOn: Date;
  mode: PaymentMode | string;
  receivedBy: string;
  kind?: PaymentKind | string;
  reference?: string | null;
  note?: string | null;
};

export type PaymentValidationResult =
  | {
      valid: true;
      warnings: string[];
    }
  | {
      valid: false;
      errors: Record<string, string[]>;
    };

export function validatePayment(
  data: PaymentInput,
  booking: BookingAmounts,
  existingPayments: (PaymentAmount & { createdAt?: Date; paidOn: Date })[],
  now: Date = new Date()
): PaymentValidationResult {
  const errors: Record<string, string[]> = {};
  const warnings: string[] = [];

  // 1. Amount validation
  if (!Number.isInteger(data.amount) || data.amount <= 0) {
    errors.amount = ["Amount must be a positive integer in rupees"];
  }

  // 2. Date validation (must not be in the future beyond clock drift / today)
  if (!data.paidOn || Number.isNaN(data.paidOn.getTime())) {
    errors.paidOn = ["Payment date is required"];
  } else if (data.paidOn.getTime() > now.getTime() + 60_000) {
    errors.paidOn = ["Payment date cannot be in the future"];
  }

  // 3. Mode validation
  const validModes: PaymentMode[] = ["UPI", "BANK", "CASH", "CHEQUE"];
  if (!data.mode || !validModes.includes(data.mode as PaymentMode)) {
    errors.mode = ["Payment mode must be UPI, BANK, CASH, or CHEQUE"];
  }

  // 4. Received By validation
  if (!data.receivedBy || !data.receivedBy.trim()) {
    errors.receivedBy = ["Received by is required"];
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  // 5. Overpayment check (Warning, not blocking)
  const currentReceived = amountReceived(existingPayments);
  const total = bookingTotal(booking);
  const nextReceived = currentReceived + data.amount;

  if (data.kind !== "REFUND" && nextReceived > total) {
    const overAmt = nextReceived - total;
    warnings.push(
      `Payment will result in an overpayment of ₹${overAmt.toLocaleString("en-IN")}.`
    );
  }

  // 6. Duplicate check within 5 minutes on same booking (Warning, not blocking)
  const fiveMinMs = 5 * 60 * 1000;
  const duplicate = existingPayments.find((p) => {
    if (p.voidedAt) return false;
    if (p.amount !== data.amount) return false;
    const timeDiff = Math.abs(p.paidOn.getTime() - data.paidOn.getTime());
    return timeDiff <= fiveMinMs;
  });

  if (duplicate) {
    warnings.push(
      `A live payment of ₹${data.amount.toLocaleString(
        "en-IN"
      )} was recorded within 5 minutes on this booking.`
    );
  }

  return { valid: true, warnings };
}
