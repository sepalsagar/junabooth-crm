import type { ReviewItem, TransformResult } from "./transform";

export type ImportProblem = ReviewItem & { severity: "blocking" | "warning" };

export function validateImport(data: TransformResult): ImportProblem[] {
  const problems: ImportProblem[] = data.reviewItems.map((item) => ({ ...item, severity: "warning" }));
  for (const booking of data.bookings) {
    if (!booking.eventDate || booking.basePrice === null) {
      problems.push({ sheet: "Master Bookings", row: 0, field: booking.sourceRef, issue: "Missing event date or billed amount; money is never guessed", value: null, severity: "blocking" });
    }
  }
  for (const expense of data.expenses) {
    if (expense.amountNeedsReview) problems.push({ sheet: "Expenditures & Accounts", row: 0, field: expense.sourceRef, issue: "Amount needs owner review", value: expense.description, severity: "blocking" });
  }
  return problems;
}
