import { z } from "zod";
import type { ExpenseCategory, Prisma } from "@/generated/prisma/client";
import { getISTParts } from "@/lib/dates";
import { categoriesOf, EXPENSE_GROUPS, type ExpenseGroup } from "./groups";

const categoryValues = [
  "OPERATOR_FEE", "TRANSPORT", "FOOD", "VENUE_CUT", "CONSUMABLES",
  "EQUIPMENT", "SOFTWARE", "CARPENTRY", "EMI", "MARKETING", "ADMIN", "OTHER",
] as const;

export const expenseFiltersSchema = z.object({
  group: z.enum(EXPENSE_GROUPS).optional().catch(undefined),
  category: z.enum(categoryValues).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  timeframe: z.enum(["this-month", "last-month"]).optional().catch(undefined),
  linked: z.enum(["linked", "unlinked"]).optional().catch(undefined),
  bookingId: z.string().optional().catch(undefined),
  paidBy: z.string().optional().catch(undefined),
  amountMin: z.coerce.number().int().nonnegative().optional().catch(undefined),
  amountMax: z.coerce.number().int().nonnegative().optional().catch(undefined),
  receipt: z.enum(["has", "missing"]).optional().catch(undefined),
  includeVoided: z.preprocess((value) => value === true || value === "true" || value === "1", z.boolean()).optional().catch(false),
  search: z.string().trim().max(200).optional().catch(undefined),
  page: z.coerce.number().int().positive().optional().catch(1),
});

export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;

export function parseExpenseFilters(input: Record<string, unknown>): ExpenseFilters {
  const parsed = expenseFiltersSchema.safeParse(input);
  return parsed.success ? parsed.data : { page: 1, includeVoided: false };
}

function istMonthBounds(now: Date, offset: number) {
  const parts = getISTParts(now);
  const firstIST = new Date(Date.UTC(parts.year, parts.month + offset, 1, 0, 0, 0, 0));
  const start = new Date(firstIST.getTime() - (5 * 60 + 30) * 60 * 1000);
  const lastIST = new Date(Date.UTC(parts.year, parts.month + offset + 1, 0, 23, 59, 59, 999));
  const end = new Date(lastIST.getTime() - (5 * 60 + 30) * 60 * 1000);
  return { start, end };
}

export function buildExpenseWhere(filters: ExpenseFilters, now: Date = new Date()) {
  const where: Prisma.ExpenseWhereInput = {};
  if (!filters.includeVoided) where.voidedAt = null;
  if (filters.group && filters.group !== "all") {
    where.category = { in: categoriesOf(filters.group as ExpenseGroup) };
  }
  if (filters.category) where.category = filters.category as ExpenseCategory;
  if (filters.linked === "linked") where.bookingId = { not: null };
  if (filters.linked === "unlinked") where.bookingId = null;
  if (filters.bookingId) where.bookingId = filters.bookingId;
  if (filters.paidBy) where.paidBy = { equals: filters.paidBy, mode: "insensitive" };
  if (filters.receipt === "has") where.receiptPath = { not: null };
  if (filters.receipt === "missing") where.receiptPath = null;
  if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
    where.amount = {};
    if (filters.amountMin !== undefined) where.amount.gte = filters.amountMin;
    if (filters.amountMax !== undefined) where.amount.lte = filters.amountMax;
  }
  if (filters.search) {
    where.note = { contains: filters.search, mode: "insensitive" };
  }
  if (filters.timeframe === "this-month") {
    const bounds = istMonthBounds(now, 0);
    where.spentOn = { gte: bounds.start, lte: bounds.end };
  } else if (filters.timeframe === "last-month") {
    const bounds = istMonthBounds(now, -1);
    where.spentOn = { gte: bounds.start, lte: bounds.end };
  } else if (filters.from || filters.to) {
    where.spentOn = {};
    if (filters.from) where.spentOn.gte = new Date(`${filters.from}T00:00:00+05:30`);
    if (filters.to) where.spentOn.lte = new Date(`${filters.to}T23:59:59.999+05:30`);
  }
  return where;
}
