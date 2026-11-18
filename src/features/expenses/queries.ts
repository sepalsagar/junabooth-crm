import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { istMonthBounds } from "@/lib/dates";
import { CATEGORY_GROUP, type ExpenseGroup } from "./groups";
import { buildExpenseWhere, type ExpenseFilters } from "./filters";
import type { ExpenseCategory, Prisma } from "@/generated/prisma/client";
import { getReceiptUrl } from "./storage";

export const EXPENSES_PAGE_SIZE = 20;

export async function getExpenses(filters: ExpenseFilters) {
  await requireRole(["PARTNER"]);
  const where = buildExpenseWhere(filters);
  const page = filters.page ?? 1;
  const [rows, total] = await db.$transaction([
    db.expense.findMany({
      where,
      skip: (page - 1) * EXPENSES_PAGE_SIZE,
      take: EXPENSES_PAGE_SIZE,
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        bookingId: true,
        category: true,
        amount: true,
        spentOn: true,
        paidBy: true,
        note: true,
        receiptPath: true,
        voidedAt: true,
        voidedById: true,
        voidReason: true,
        booking: { select: { id: true, code: true, clientName: true } },
      },
    }),
    db.expense.count({ where }),
  ]);
  return {
    rows,
    total,
    page,
    pageSize: EXPENSES_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / EXPENSES_PAGE_SIZE)),
  };
}

export async function getExpenseTotals(filters: ExpenseFilters) {
  await requireRole(["PARTNER"]);
  const liveWhere: Prisma.ExpenseWhereInput = { ...buildExpenseWhere(filters), voidedAt: null };
  const byCategory = await db.expense.groupBy({
    by: ["category"],
    where: liveWhere,
    _sum: { amount: true },
  });
  const categoryTotals = Object.fromEntries(
    byCategory.map((row) => [row.category, row._sum.amount ?? 0])
  ) as Partial<Record<ExpenseCategory, number>>;
  const groupTotals = {} as Record<Exclude<ExpenseGroup, "all">, number>;
  for (const row of byCategory) {
    const group = CATEGORY_GROUP[row.category];
    groupTotals[group] = (groupTotals[group] ?? 0) + (row._sum.amount ?? 0);
  }
  return { categoryTotals, groupTotals };
}

export async function getMonthlySpend(now: Date = new Date()) {
  await requireRole(["PARTNER"]);
  const bounds = istMonthBounds(now);
  const result = await db.expense.aggregate({
    where: { spentOn: { gte: bounds.start, lte: bounds.end }, voidedAt: null },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function getBookingCosts(bookingId: string) {
  await requireRole(["PARTNER"]);
  const rows = await db.expense.findMany({
    where: { bookingId },
    orderBy: { spentOn: "desc" },
    select: {
      id: true,
      category: true,
      amount: true,
      spentOn: true,
      paidBy: true,
      note: true,
      receiptPath: true,
      voidedAt: true,
      voidReason: true,
    },
  });
  return Promise.all(rows.map(async (row) => ({
    ...row,
    receiptUrl: row.receiptPath ? await getReceiptUrl(row.receiptPath) : null,
  })));
}

export async function getExpenseFormOptions() {
  await requireRole(["PARTNER"]);
  const now = new Date();
  const istStart = new Date(now.getTime());
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [bookings, paidByRows] = await Promise.all([
    db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        eventDate: { gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)), lte: tomorrow },
      },
      orderBy: { eventDate: "asc" },
      take: 30,
      select: { id: true, code: true, clientName: true, eventDate: true },
    }),
    db.expense.findMany({
      where: { paidBy: { not: null } },
      distinct: ["paidBy"],
      take: 20,
      select: { paidBy: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return {
    bookings,
    paidBy: paidByRows.map((row) => row.paidBy).filter((value): value is string => Boolean(value)),
  };
}
