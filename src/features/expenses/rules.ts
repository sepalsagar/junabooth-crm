import { z } from "zod";
import type { ExpenseCategory } from "@/generated/prisma/client";
import { endOfTodayIST } from "@/lib/dates";

export const expenseSchema = z.object({
  id: z.string().optional(),
  bookingId: z.string().optional(),
  category: z.enum([
    "OPERATOR_FEE", "TRANSPORT", "FOOD", "VENUE_CUT", "CONSUMABLES",
    "EQUIPMENT", "SOFTWARE", "CARPENTRY", "EMI", "MARKETING", "ADMIN", "OTHER",
  ]),
  amount: z.number().int().positive(),
  spentOn: z.union([z.date(), z.string()]).transform((value) => new Date(value)),
  paidBy: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export function validateExpense(input: unknown, now: Date = new Date()) {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  if (parsed.data.spentOn > endOfTodayIST(now)) {
    return { ok: false as const, errors: { spentOn: ["Expense date cannot be in the future"] } };
  }
  return { ok: true as const, data: parsed.data };
}

export function likelyDuplicate(
  expense: { amount: number; category: ExpenseCategory; spentOn: Date; paidBy?: string | null },
  existing: Array<{ amount: number; category: ExpenseCategory; spentOn: Date; paidBy?: string | null }>
) {
  return existing.some((item) =>
    item.amount === expense.amount &&
    item.category === expense.category &&
    item.paidBy?.trim() === expense.paidBy?.trim() &&
    item.spentOn.toISOString().slice(0, 10) === expense.spentOn.toISOString().slice(0, 10)
  );
}

export function validateReceiptFile({ type, size }: { type: string; size: number }) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    return { ok: false as const, error: "Only JPEG, PNG, and WebP images are allowed" };
  }
  if (!Number.isFinite(size) || size <= 0 || size > 5 * 1024 * 1024) {
    return { ok: false as const, error: "Receipt must be 5 MB or smaller" };
  }
  return { ok: true as const };
}
