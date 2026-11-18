"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { validateExpense, likelyDuplicate } from "./rules";
import { expenseCreateSchema, expenseUpdateSchema, voidExpenseSchema } from "./schema";

type ActionResult<T = unknown> =
  | { ok: true; data: T; warnings?: string[] }
  | { ok: false; error: string; errors?: Record<string, string[] | undefined> };

export async function createExpense(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["PARTNER"]);
  const parsed = expenseCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed.", errors: parsed.error.flatten().fieldErrors };
  }
  const validation = validateExpense(parsed.data);
  if (!validation.ok) return { ok: false, error: "Validation failed.", errors: validation.errors };

  const existing = await db.expense.findMany({
    where: {
      amount: parsed.data.amount,
      category: parsed.data.category,
      spentOn: parsed.data.spentOn,
      paidBy: parsed.data.paidBy ?? null,
      voidedAt: null,
    },
    select: { amount: true, category: true, spentOn: true, paidBy: true },
  });
  const duplicate = likelyDuplicate(parsed.data, existing);

  const expense = await db.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        bookingId: parsed.data.bookingId || null,
        category: parsed.data.category,
        amount: parsed.data.amount,
        spentOn: parsed.data.spentOn,
        paidBy: parsed.data.paidBy || null,
        note: parsed.data.note || null,
      },
    });
    if (parsed.data.bookingId) {
      await tx.bookingActivity.create({
        data: {
          bookingId: parsed.data.bookingId,
          userId: session.user.id,
          type: "NOTE",
          message: `Expense added: ₹${parsed.data.amount} (${parsed.data.category})`,
        },
      });
    }
    return created;
  });

  revalidatePath("/expenditure");
  revalidatePath("/bookings");
  if (parsed.data.bookingId) revalidatePath("/bookings");
  return {
    ok: true,
    data: { id: expense.id },
    warnings: duplicate ? ["A similar expense may already exist"] : undefined,
  };
}

export async function updateExpense(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["PARTNER"]);
  const parsed = expenseUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed.", errors: parsed.error.flatten().fieldErrors };
  }
  const existing = await db.expense.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, bookingId: true, category: true, amount: true, spentOn: true, paidBy: true, note: true },
  });
  if (!existing) return { ok: false, error: "Expense not found" };
  const validation = validateExpense({ ...existing, ...parsed.data });
  if (!validation.ok) return { ok: false, error: "Validation failed.", errors: validation.errors };

  await db.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: existing.id },
      data: {
        bookingId: parsed.data.bookingId ?? existing.bookingId,
        category: parsed.data.category ?? existing.category,
        amount: parsed.data.amount ?? existing.amount,
        spentOn: parsed.data.spentOn ?? existing.spentOn,
        paidBy: parsed.data.paidBy ?? existing.paidBy,
        note: parsed.data.note ?? existing.note,
      },
    });
    if (existing.bookingId) {
      await tx.bookingActivity.create({
        data: {
          bookingId: existing.bookingId,
          userId: session.user.id,
          type: "NOTE",
          message: `Expense updated: ₹${parsed.data.amount ?? existing.amount} (${parsed.data.category ?? existing.category})`,
        },
      });
    }
  });
  revalidatePath("/expenditure");
  revalidatePath("/bookings");
  return { ok: true, data: { id: existing.id } };
}

export async function voidExpense(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["PARTNER"]);
  const parsed = voidExpenseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed.", errors: parsed.error.flatten().fieldErrors };
  }
  const expense = await db.expense.findUnique({
    where: { id: parsed.data.expenseId },
    select: { id: true, bookingId: true, amount: true, category: true, voidedAt: true },
  });
  if (!expense) return { ok: false, error: "Expense not found" };
  if (expense.voidedAt) return { ok: false, error: "This expense is already voided" };

  await db.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expense.id },
      data: { voidedAt: new Date(), voidedById: session.user.id, voidReason: parsed.data.reason },
    });
    if (expense.bookingId) {
      await tx.bookingActivity.create({
        data: {
          bookingId: expense.bookingId,
          userId: session.user.id,
          type: "NOTE",
          message: `Expense voided: ₹${expense.amount} (${expense.category}). Reason: ${parsed.data.reason}`,
        },
      });
    }
  });
  revalidatePath("/expenditure");
  revalidatePath("/bookings");
  return { ok: true, data: { id: expense.id } };
}
