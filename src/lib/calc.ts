export type BookingAmounts = {
  basePrice: number;
  travelCharge: number;
  discount: number;
};

export type PaymentAmount = {
  amount: number;
  kind: "ADVANCE" | "PART" | "FINAL" | "REFUND";
};

export type PaymentStatus =
  | "AWAITING_ADVANCE"
  | "ADVANCE_PAID"
  | "FULLY_PAID"
  | "OVERPAID";

export function bookingTotal({ basePrice, travelCharge, discount }: BookingAmounts) {
  return basePrice + travelCharge - discount;
}

export function amountReceived(payments: PaymentAmount[]) {
  return payments.reduce(
    (total, payment) => total + (payment.kind === "REFUND" ? -payment.amount : payment.amount),
    0,
  );
}

export function balanceDue(booking: BookingAmounts, payments: PaymentAmount[]) {
  return bookingTotal(booking) - amountReceived(payments);
}

export function paymentStatus(booking: BookingAmounts, payments: PaymentAmount[]): PaymentStatus {
  const received = amountReceived(payments);
  const total = bookingTotal(booking);

  if (received > total) return "OVERPAID";
  if (received === total) return "FULLY_PAID";
  if (received > 0) return "ADVANCE_PAID";
  return "AWAITING_ADVANCE";
}
