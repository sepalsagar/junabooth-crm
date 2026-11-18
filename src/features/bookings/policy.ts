// Cancellation and refund policy calculations
// Open client question: refund is calculated as a percentage of the amount
// already received (not total booking price), measured relative to event start time.

export function refundPercent(
  eventStart: Date | string,
  cancelledAt: Date | string = new Date()
): number {
  const start = typeof eventStart === "string" ? new Date(eventStart) : eventStart;
  const cancel = typeof cancelledAt === "string" ? new Date(cancelledAt) : cancelledAt;

  const diffMs = start.getTime() - cancel.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours >= 168) return 100; // 7+ days (168 hours) before event
  if (diffHours >= 72) return 75;   // 3+ days (72 hours) before event
  if (diffHours >= 48) return 50;   // 2+ days (48 hours) before event
  return 0;                         // Less than 48 hours or after event
}

export function refundAmount(received: number, percent: number): number {
  if (received <= 0 || percent <= 0) return 0;
  return Math.round((received * percent) / 100);
}
