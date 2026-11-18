export type BookingAmounts = {
  basePrice: number;
  travelCharge: number;
  discount: number;
};

export type PaymentAmount = {
  amount: number;
  kind: "ADVANCE" | "PART" | "FINAL" | "REFUND";
  voidedAt?: Date | string | null;
};

export type PaymentStatus =
  | "AWAITING_ADVANCE"
  | "ADVANCE_PAID"
  | "FULLY_PAID"
  | "OVERPAID"
  | "PAY_ON_EVENT";

// Filters out voided payments so all calculations only use live rows
export function livePayments<T extends { voidedAt?: Date | string | null }>(
  payments: T[]
): T[] {
  return payments.filter((p) => !p.voidedAt);
}

export function bookingTotal({
  basePrice,
  travelCharge,
  discount,
}: BookingAmounts) {
  return basePrice + travelCharge - discount;
}

export function amountReceived(payments: PaymentAmount[]) {
  return livePayments(payments).reduce(
    (total, payment) =>
      total + (payment.kind === "REFUND" ? -payment.amount : payment.amount),
    0
  );
}

export function balanceDue(booking: BookingAmounts, payments: PaymentAmount[]) {
  return bookingTotal(booking) - amountReceived(payments);
}

export function paymentStatus(
  booking: BookingAmounts,
  payments: PaymentAmount[],
  payOnEvent: boolean = false
): PaymentStatus {
  const received = amountReceived(payments);
  const total = bookingTotal(booking);

  if (received > total) return "OVERPAID";
  if (received === total) return "FULLY_PAID";
  if (received > 0) return "ADVANCE_PAID";
  if (payOnEvent) return "PAY_ON_EVENT";
  return "AWAITING_ADVANCE";
}

export function paymentStatusLabel(
  status: PaymentStatus,
  payOnEvent: boolean = false
): string {
  if (status === "PAY_ON_EVENT" || (payOnEvent && status === "AWAITING_ADVANCE")) {
    return "Pay on event";
  }
  switch (status) {
    case "AWAITING_ADVANCE":
      return "Awaiting advance";
    case "ADVANCE_PAID":
      return "Advance paid";
    case "FULLY_PAID":
      return "Fully paid";
    case "OVERPAID":
      return "Overpaid";
    default:
      return status;
  }
}
