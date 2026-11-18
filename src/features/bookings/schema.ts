import { z } from "zod";
import { isValidIndianMobile, normalizePhone } from "@/features/leads/phone";

export const BOOKING_STATUSES = [
  "OPTION",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "POSTPONED",
] as const;
export type BookingStatusType = (typeof BOOKING_STATUSES)[number];

export const BOOKING_TYPES = ["PAID", "COLLAB", "B2B"] as const;
export type BookingTypeKind = (typeof BOOKING_TYPES)[number];

export const PAYMENT_MODES = ["UPI", "BANK", "CASH", "CHEQUE"] as const;
export type PaymentModeType = (typeof PAYMENT_MODES)[number];

export const PAYMENT_KINDS = ["ADVANCE", "PART", "FINAL", "REFUND"] as const;
export type PaymentKindType = (typeof PAYMENT_KINDS)[number];

export const PRINT_SIZES = ["TWO_BY_SIX", "FOUR_BY_SIX"] as const;
export type PrintSizeKind = (typeof PRINT_SIZES)[number];

export const PAYMENT_STATUS_FILTERS = [
  "AWAITING_ADVANCE",
  "ADVANCE_PAID",
  "FULLY_PAID",
  "OVERPAID",
  "PAY_ON_EVENT",
] as const;
export type PaymentStatusFilterType = (typeof PAYMENT_STATUS_FILTERS)[number];

function stringArrayPreprocess(val: unknown): string[] {
  if (Array.isArray(val)) return val.flatMap((v) => String(v).split(",").map((s) => s.trim())).filter(Boolean);
  if (typeof val === "string" && val.trim().length > 0) {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function dateOrUndefined(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

export const bookingFiltersSchema = z.object({
  q: z.string().optional().transform((v) => (v ? v.trim() : undefined)),
  status: z
    .preprocess(stringArrayPreprocess, z.array(z.enum(BOOKING_STATUSES)))
    .catch([]),
  city: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  type: z
    .preprocess(stringArrayPreprocess, z.array(z.enum(BOOKING_TYPES)))
    .catch([]),
  from: z.preprocess(dateOrUndefined, z.date().optional()).catch(undefined),
  to: z.preprocess(dateOrUndefined, z.date().optional()).catch(undefined),
  timeframe: z
    .enum(["this-week", "this-month", "past"])
    .optional()
    .catch(undefined),
  belowRate: z
    .preprocess((v) => v === true || v === "true" || v === "1", z.boolean().optional())
    .catch(undefined),
  paymentStatus: z
    .preprocess(stringArrayPreprocess, z.array(z.enum(PAYMENT_STATUS_FILTERS)))
    .catch([]),
  balanceDue: z
    .enum(["all", "has_balance", "no_balance"])
    .optional()
    .catch(undefined),
  sort: z.string().optional().catch("eventDate_asc"),
  page: z
    .preprocess((v) => (v ? Number(v) : 1), z.number().int().positive())
    .catch(1),
});

export type BookingFilters = z.infer<typeof bookingFiltersSchema>;

export const phoneSchema = z
  .string()
  .transform((val) => normalizePhone(val))
  .refine((val) => isValidIndianMobile(val), {
    message: "Enter a valid 10-digit Indian mobile number",
  });

export const convertLeadToBookingSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  eventDate: z.preprocess(dateOrUndefined, z.date({ message: "Event date is required" })),
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  packageId: z.string().trim().optional(),
  packageName: z.string().trim().min(1, "Package name is required"),
  basePrice: z.coerce.number().int().nonnegative("Base price must be >= 0"),
  travelCharge: z.coerce.number().int().nonnegative("Travel charge must be >= 0").default(0),
  discount: z.coerce.number().int().nonnegative("Discount must be >= 0").default(0),
  type: z.enum(BOOKING_TYPES).default("PAID"),
  payOnEvent: z.boolean().default(false),
  venue: z.string().trim().optional(),
  city: z.string().trim().optional(),
  dayContact: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  // Optional immediate advance payment
  advanceAmount: z.coerce.number().int().nonnegative().optional(),
  advanceMode: z.enum(PAYMENT_MODES).optional(),
  advanceReceivedBy: z.string().trim().optional(),
});

export type ConvertLeadToBookingInput = z.infer<typeof convertLeadToBookingSchema>;

export const createBookingSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required"),
  phone: phoneSchema,
  city: z.string().trim().optional(),
  venue: z.string().trim().optional(),
  mapLink: z.string().trim().optional(),
  eventDate: z.preprocess(dateOrUndefined, z.date({ message: "Event date is required" })),
  startTime: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  packageId: z.string().trim().optional(),
  packageName: z.string().trim().min(1, "Package name is required"),
  basePrice: z.coerce.number().int().nonnegative("Base price must be >= 0"),
  travelCharge: z.coerce.number().int().nonnegative("Travel charge must be >= 0").default(0),
  discount: z.coerce.number().int().nonnegative("Discount must be >= 0").default(0),
  type: z.enum(BOOKING_TYPES).default("PAID"),
  status: z.enum(BOOKING_STATUSES).default("CONFIRMED"),
  payOnEvent: z.boolean().default(false),
  dayContact: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  printSize: z.enum(PRINT_SIZES).optional(),
  printsUsed: z.coerce.number().int().nonnegative().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = createBookingSchema.partial().extend({
  id: z.string().min(1),
  priceEditReason: z.string().trim().optional(),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export const changeBookingStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(BOOKING_STATUSES),
  newEventDate: z.preprocess(dateOrUndefined, z.date().optional()),
  reason: z.string().trim().optional(),
  printSize: z.enum(PRINT_SIZES).optional(),
  printsUsed: z.coerce.number().int().nonnegative().optional(),
});

export type ChangeBookingStatusInput = z.infer<typeof changeBookingStatusSchema>;

export const recordPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  amount: z.coerce.number().int().positive("Amount must be greater than 0"),
  paidOn: z.preprocess(dateOrUndefined, z.date({ message: "Payment date is required" })),
  kind: z.enum(PAYMENT_KINDS).default("PART"),
  mode: z.enum(PAYMENT_MODES),
  receivedBy: z.string().trim().min(1, "Received by is required"),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const voidPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  reason: z.string().trim().min(3, "A detailed void reason is required (minimum 3 characters)"),
});

export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  refundAmount: z.coerce.number().int().nonnegative().default(0),
  refundMode: z.enum(PAYMENT_MODES).optional(),
  reason: z.string().trim().min(3, "Cancellation reason is required"),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
