"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { parseISODateIST } from "@/lib/dates";
import { getCashPosition } from "@/features/metrics/queries";
import { addCapitalEntrySchema, voidCapitalEntrySchema } from "./schema";

export type ActionResult<T = unknown> =
  | { ok: true; data: T; warning?: string }
  | { ok: false; error: string; warning?: string; errors?: Record<string, string[] | undefined> };

export async function addCapitalEntry(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  // Guard at the SERVER: PARTNER only
  await requireRole(["PARTNER"]);

  const parsed = addCapitalEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed. Please check form fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Check if withdrawal pushes cash in hand below zero
  if (data.kind === "WITHDRAWN") {
    const currentCash = await getCashPosition();
    const remainingCash = currentCash.total - data.amount;

    if (remainingCash < 0 && !data.confirmBelowZero) {
      return {
        ok: false,
        warning: "WITHDRAWAL_BELOW_ZERO",
        error: `This withdrawal of ₹${data.amount.toLocaleString("en-IN")} exceeds current cash in hand (₹${currentCash.total.toLocaleString("en-IN")}), resulting in a negative balance of ₹${remainingCash.toLocaleString("en-IN")}. Please confirm to proceed.`,
      };
    }
  }

  const parsedDate = parseISODateIST(data.date) ?? new Date(data.date);

  const entry = await db.capitalEntry.create({
    data: {
      partnerId: data.partnerId,
      kind: data.kind,
      amount: data.amount,
      date: parsedDate,
      mode: data.mode ?? null,
      note: data.note ?? null,
    },
  });

  revalidatePath("/partners");
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: entry.id },
  };
}

export async function voidCapitalEntry(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  // Guard at the SERVER: PARTNER only
  const session = await requireRole(["PARTNER"]);

  const parsed = voidCapitalEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed. Reason is required (min 3 characters).",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  const existing = await db.capitalEntry.findUnique({
    where: { id: data.entryId },
  });

  if (!existing) {
    return { ok: false, error: "Capital entry not found." };
  }

  if (existing.voidedAt) {
    return { ok: false, error: "Entry is already voided." };
  }

  // Never delete; set voidedAt and voidReason
  await db.capitalEntry.update({
    where: { id: data.entryId },
    data: {
      voidedAt: new Date(),
      voidedById: session.user.id,
      voidReason: data.reason,
    },
  });

  revalidatePath("/partners");
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: existing.id },
  };
}
