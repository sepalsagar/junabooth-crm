import { z } from "zod";

export const CAPITAL_KINDS = ["INJECTED", "WITHDRAWN"] as const;
export type CapitalKindType = (typeof CAPITAL_KINDS)[number];

export const PAYMENT_MODES = ["UPI", "BANK", "CASH", "CHEQUE"] as const;
export type PaymentModeType = (typeof PAYMENT_MODES)[number];

export const addCapitalEntrySchema = z.object({
  partnerId: z.string().min(1, "Partner is required"),
  kind: z.enum(CAPITAL_KINDS),
  amount: z.coerce.number().int().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  mode: z.enum(PAYMENT_MODES).optional().nullable(),
  note: z.string().trim().optional().nullable(),
  confirmBelowZero: z.boolean().default(false),
});
export type AddCapitalEntryInput = z.infer<typeof addCapitalEntrySchema>;

export const voidCapitalEntrySchema = z.object({
  entryId: z.string().min(1, "Entry ID is required"),
  reason: z.string().trim().min(3, "Reason is required (min 3 characters)"),
});
export type VoidCapitalEntryInput = z.infer<typeof voidCapitalEntrySchema>;
