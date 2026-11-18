"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { nextCode } from "@/lib/codes";
import { formatDateIST, startOfTodayIST } from "@/lib/dates";
import { validateStatusChange } from "./rules";
import {
  addNoteSchema,
  changeStatusSchema,
  createLeadSchema,
  setFollowUpSchema,
  updateLeadSchema,
} from "./schema";

export type ActionResult<T = unknown> =
  | { ok: true; data: T; duplicateWarning?: string }
  | { ok: false; error: string; errors?: Record<string, string[] | undefined> };

export async function createLead(rawInput: unknown): Promise<ActionResult<{ id: string; code: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = createLeadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed. Please check form inputs.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Duplicate phone warning (informational, not blocking)
  let duplicateWarning: string | undefined;
  const existingWithPhone = await db.lead.findFirst({
    where: { phone: data.phone },
    select: { code: true, clientName: true },
  });
  if (existingWithPhone) {
    duplicateWarning = `Phone number ${data.phone} is already linked to lead ${existingWithPhone.code} (${existingWithPhone.clientName}).`;
  }

  // Atomic creation of lead + ENQ code + initial activity
  const lead = await db.$transaction(async (tx) => {
    const code = await nextCode("ENQ", tx);
    const created = await tx.lead.create({
      data: {
        code,
        clientName: data.clientName,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        city: data.city,
        eventType: data.eventType,
        targetDate: data.targetDate,
        venue: data.venue,
        source: data.source,
        quotedAmount: data.quotedAmount,
        packageName: data.packageName,
        nextFollowUp: data.nextFollowUp,
        notes: data.notes,
        ownerId: data.ownerId || session.user.id,
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId: created.id,
        userId: session.user.id,
        type: "CREATED",
        message: `Lead created (${code})`,
      },
    });

    return created;
  });

  revalidatePath("/leads");
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: lead.id, code: lead.code },
    duplicateWarning,
  };
}

export async function updateLead(rawInput: unknown): Promise<ActionResult<{ id: string; code: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = updateLeadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed. Please check form inputs.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const existing = await db.lead.findUnique({
    where: { id: data.id },
  });

  if (!existing) {
    return { ok: false, error: "Lead not found" };
  }

  let duplicateWarning: string | undefined;
  if (data.phone && data.phone !== existing.phone) {
    const dup = await db.lead.findFirst({
      where: { phone: data.phone, NOT: { id: data.id } },
      select: { code: true, clientName: true },
    });
    if (dup) {
      duplicateWarning = `Phone number ${data.phone} is already linked to lead ${dup.code} (${dup.clientName}).`;
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.lead.update({
      where: { id: data.id },
      data: {
        clientName: data.clientName,
        phone: data.phone,
        whatsapp: data.whatsapp,
        city: data.city,
        eventType: data.eventType,
        targetDate: data.targetDate,
        venue: data.venue,
        source: data.source,
        quotedAmount: data.quotedAmount,
        packageName: data.packageName,
        nextFollowUp: data.nextFollowUp,
        notes: data.notes,
        ownerId: data.ownerId,
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId: data.id,
        userId: session.user.id,
        type: "EDITED",
        message: "Lead details updated",
      },
    });

    return res;
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${existing.code}`);

  return {
    ok: true,
    data: { id: updated.id, code: updated.code },
    duplicateWarning,
  };
}

export async function changeStatus(rawInput: unknown): Promise<ActionResult<{ id: string; code: string; status: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = changeStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Enforce server business rules
  const validation = validateStatusChange(
    data.status,
    {
      nextFollowUp: data.nextFollowUp,
      lostReason: data.lostReason,
    },
    new Date()
  );

  if (!validation.valid) {
    return {
      ok: false,
      error: validation.error,
    };
  }

  const existing = await db.lead.findUnique({
    where: { id: data.leadId },
  });

  if (!existing) {
    return { ok: false, error: "Lead not found" };
  }

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.lead.update({
      where: { id: data.leadId },
      data: {
        status: data.status,
        nextFollowUp: data.nextFollowUp !== undefined ? data.nextFollowUp : existing.nextFollowUp,
        lostReason: data.status === "LOST" ? data.lostReason : null,
      },
    });

    const msg =
      data.status === "LOST"
        ? `Status changed to LOST (${data.lostReason})`
        : `Status changed to ${data.status}`;

    await tx.leadActivity.create({
      data: {
        leadId: data.leadId,
        userId: session.user.id,
        type: "STATUS_CHANGED",
        message: msg,
      },
    });

    return res;
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${existing.code}`);
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: updated.id, code: updated.code, status: updated.status },
  };
}

export async function addNote(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = addNoteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const existing = await db.lead.findUnique({
    where: { id: data.leadId },
    select: { code: true },
  });

  if (!existing) {
    return { ok: false, error: "Lead not found" };
  }

  const activity = await db.leadActivity.create({
    data: {
      leadId: data.leadId,
      userId: session.user.id,
      type: "NOTE",
      message: data.message,
    },
  });

  revalidatePath(`/leads/${existing.code}`);

  return {
    ok: true,
    data: { id: activity.id },
  };
}

export async function setFollowUp(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = setFollowUpSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  if (data.nextFollowUp && data.nextFollowUp < startOfTodayIST(new Date())) {
    return {
      ok: false,
      error: "Follow-up date cannot be in the past",
    };
  }

  const existing = await db.lead.findUnique({
    where: { id: data.leadId },
    select: { code: true },
  });

  if (!existing) {
    return { ok: false, error: "Lead not found" };
  }

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: data.leadId },
      data: { nextFollowUp: data.nextFollowUp },
    });

    const msg = data.nextFollowUp
      ? `Follow-up set for ${formatDateIST(data.nextFollowUp)}`
      : "Follow-up cleared";

    await tx.leadActivity.create({
      data: {
        leadId: data.leadId,
        userId: session.user.id,
        type: "FOLLOW_UP_SET",
        message: msg,
      },
    });
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${existing.code}`);
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: data.leadId },
  };
}
