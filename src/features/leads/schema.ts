import { z } from "zod";
import { isValidIndianMobile, normalizePhone } from "./phone";

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "FOLLOW_UP",
  "WON",
  "LOST",
  "POSTPONED",
] as const;
export type LeadStatusType = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "INSTAGRAM",
  "META_AD",
  "BNI",
  "PSC",
  "WEBSITE",
  "REFERRAL",
  "B2B_PARTNER",
  "PHONE",
  "TR_EVENT",
  "OTHER",
] as const;
export type LeadSourceType = (typeof LEAD_SOURCES)[number];

export const LOST_REASONS = [
  "Budget",
  "Date taken",
  "No reply",
  "Outstation",
  "Other",
] as const;
export type LostReasonType = (typeof LOST_REASONS)[number];

export const FOLLOW_UP_FILTERS = ["overdue", "today", "week", "none"] as const;
export type FollowUpFilterType = (typeof FOLLOW_UP_FILTERS)[number];

// Helper to coerce array of strings from either array, comma-separated string, or single value
function stringArrayPreprocess(val: unknown): string[] {
  if (Array.isArray(val)) return val.flatMap((v) => String(v).split(",").map((s) => s.trim())).filter(Boolean);
  if (typeof val === "string" && val.trim().length > 0) {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// Helper to coerce string dates safely (returns undefined on invalid)
function dateOrUndefined(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

export const leadFiltersSchema = z.object({
  q: z.string().optional().transform((v) => (v ? v.trim() : undefined)),
  status: z
    .preprocess(stringArrayPreprocess, z.array(z.enum(LEAD_STATUSES)))
    .catch([]),
  city: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  source: z
    .preprocess(stringArrayPreprocess, z.array(z.enum(LEAD_SOURCES)))
    .catch([]),
  eventType: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  owner: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  from: z.preprocess(dateOrUndefined, z.date().optional()).catch(undefined),
  to: z.preprocess(dateOrUndefined, z.date().optional()).catch(undefined),
  createdFrom: z.preprocess(dateOrUndefined, z.date().optional()).catch(undefined),
  createdTo: z.preprocess(dateOrUndefined, z.date().optional()).catch(undefined),
  followUp: z
    .enum(FOLLOW_UP_FILTERS)
    .optional()
    .catch(undefined),
  minAmt: z
    .preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().nonnegative().optional())
    .catch(undefined),
  maxAmt: z
    .preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().nonnegative().optional())
    .catch(undefined),
  sort: z
    .string()
    .optional()
    .catch("newest"),
  page: z
    .preprocess((v) => (v ? Number(v) : 1), z.number().int().positive())
    .catch(1),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;

export const phoneSchema = z
  .string()
  .transform((val) => normalizePhone(val))
  .refine((val) => isValidIndianMobile(val), {
    message: "Enter a valid 10-digit Indian mobile number (starts with 6-9)",
  });

export const createLeadSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required"),
  phone: phoneSchema,
  whatsapp: z
    .string()
    .optional()
    .transform((v) => (v ? normalizePhone(v) : undefined))
    .refine((v) => !v || isValidIndianMobile(v), {
      message: "Enter a valid 10-digit WhatsApp number",
    }),
  city: z.string().trim().optional(),
  eventType: z.string().trim().optional(),
  targetDate: z.preprocess(dateOrUndefined, z.date().optional()),
  venue: z.string().trim().optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  quotedAmount: z
    .preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().nonnegative().optional())
    .optional(),
  packageName: z.string().trim().optional(),
  nextFollowUp: z.preprocess(dateOrUndefined, z.date().optional()),
  notes: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string().min(1),
  status: z.enum(LEAD_STATUSES).optional(),
  lostReason: z.string().trim().optional(),
});

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const changeStatusSchema = z.object({
  leadId: z.string().min(1),
  status: z.enum(LEAD_STATUSES),
  nextFollowUp: z.preprocess(dateOrUndefined, z.date().optional().nullable()),
  lostReason: z.string().trim().optional().nullable(),
});

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export const addNoteSchema = z.object({
  leadId: z.string().min(1),
  message: z.string().trim().min(1, "Note message cannot be empty"),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

export const setFollowUpSchema = z.object({
  leadId: z.string().min(1),
  nextFollowUp: z.preprocess(dateOrUndefined, z.date().nullable()),
});

export type SetFollowUpInput = z.infer<typeof setFollowUpSchema>;
