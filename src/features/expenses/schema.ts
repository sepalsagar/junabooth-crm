import { z } from "zod";

export const expenseCreateSchema = z.object({
  bookingId: z.string().optional(),
  category: z.enum([
    "OPERATOR_FEE", "TRANSPORT", "FOOD", "VENUE_CUT", "CONSUMABLES",
    "EQUIPMENT", "SOFTWARE", "CARPENTRY", "EMI", "MARKETING", "ADMIN", "OTHER",
  ]),
  amount: z.coerce.number().int().positive(),
  spentOn: z.coerce.date(),
  paidBy: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const voidExpenseSchema = z.object({
  expenseId: z.string().min(1),
  reason: z.string().trim().min(3, "A detailed void reason is required"),
});
