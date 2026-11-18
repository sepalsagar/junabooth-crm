"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guards";
import { nextCode } from "@/lib/codes";
import { balanceDue } from "@/lib/calc";
import { startOfTodayIST } from "@/lib/dates";
import { canMove, validatePayment } from "./rules";
import {
  cancelBookingSchema,
  changeBookingStatusSchema,
  convertLeadToBookingSchema,
  createBookingSchema,
  recordPaymentSchema,
  updateBookingSchema,
  voidPaymentSchema,
} from "./schema";

export type ActionResult<T = unknown> =
  | { ok: true; data: T; warnings?: string[] }
  | { ok: false; error: string; errors?: Record<string, string[] | undefined> };

export async function convertLeadToBooking(
  rawInput: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = convertLeadToBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed. Please check booking details.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  // Validate that the lead exists and is open
  const lead = await db.lead.findUnique({
    where: { id: data.leadId },
    select: {
      id: true,
      code: true,
      status: true,
      clientName: true,
      phone: true,
      city: true,
      venue: true,
      notes: true,
      booking: { select: { id: true, code: true } },
    },
  });

  if (!lead) {
    return { ok: false, error: "Lead not found" };
  }

  if (lead.booking || lead.status === "WON") {
    return { ok: false, error: "This lead was already converted to a booking" };
  }

  try {
    const booking = await db.$transaction(async (tx) => {
      const code = await nextCode("JB", tx);

      // Snapshot lead values with user-provided overrides
      const createdBooking = await tx.booking.create({
        data: {
          code,
          leadId: lead.id,
          clientName: lead.clientName,
          phone: lead.phone,
          city: data.city || lead.city,
          venue: data.venue || lead.venue,
          eventDate: data.eventDate,
          startTime: data.startTime,
          endTime: data.endTime,
          packageId: data.packageId || null,
          packageName: data.packageName,
          basePrice: data.basePrice,
          travelCharge: data.travelCharge,
          discount: data.discount,
          type: data.type,
          status: "CONFIRMED",
          payOnEvent: data.payOnEvent,
          dayContact: data.dayContact,
          notes: data.notes || lead.notes,
        },
      });

      // Optional initial advance payment
      if (data.advanceAmount && data.advanceAmount > 0) {
        await tx.payment.create({
          data: {
            bookingId: createdBooking.id,
            amount: data.advanceAmount,
            kind: "ADVANCE",
            mode: data.advanceMode || "UPI",
            paidOn: new Date(),
            receivedBy: data.advanceReceivedBy || session.user.name,
            note: "Initial advance on lead conversion",
          },
        });
      }

      // Update lead to WON and clear next follow-up
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: "WON",
          nextFollowUp: null,
        },
      });

      // Log activity on lead
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: session.user.id,
          type: "STATUS_CHANGED",
          message: `Converted to booking ${code}`,
        },
      });

      // Log activity on booking
      await tx.bookingActivity.create({
        data: {
          bookingId: createdBooking.id,
          userId: session.user.id,
          type: "CREATED",
          message: `Booking created from lead ${lead.code} (${code})`,
        },
      });

      if (data.advanceAmount && data.advanceAmount > 0) {
        await tx.bookingActivity.create({
          data: {
            bookingId: createdBooking.id,
            userId: session.user.id,
            type: "PAYMENT_ADDED",
            message: `Advance payment of ₹${data.advanceAmount} recorded`,
          },
        });
      }

      return createdBooking;
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.code}`);
    revalidatePath("/bookings");
    revalidatePath("/overview");

    return {
      ok: true,
      data: { id: booking.id, code: booking.code },
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "This lead was already converted" };
    }
    throw err;
  }
}

export async function createBooking(
  rawInput: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = createBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed. Please check form inputs.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  const booking = await db.$transaction(async (tx) => {
    const code = await nextCode("JB", tx);
    const created = await tx.booking.create({
      data: {
        code,
        clientName: data.clientName,
        phone: data.phone,
        city: data.city,
        venue: data.venue,
        mapLink: data.mapLink,
        eventDate: data.eventDate,
        startTime: data.startTime,
        endTime: data.endTime,
        packageId: data.packageId || null,
        packageName: data.packageName,
        basePrice: data.basePrice,
        travelCharge: data.travelCharge,
        discount: data.discount,
        type: data.type,
        status: data.status,
        payOnEvent: data.payOnEvent,
        dayContact: data.dayContact,
        notes: data.notes,
        printSize: data.printSize,
        printsUsed: data.printsUsed,
      },
    });

    await tx.bookingActivity.create({
      data: {
        bookingId: created.id,
        userId: session.user.id,
        type: "CREATED",
        message: `Direct booking created (${code})`,
      },
    });

    return created;
  });

  revalidatePath("/bookings");
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: booking.id, code: booking.code },
  };
}

export async function updateBooking(
  rawInput: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = updateBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const existing = await db.booking.findUnique({
    where: { id: data.id },
  });

  if (!existing) {
    return { ok: false, error: "Booking not found" };
  }

  // Price edits locked after COMPLETED except for PARTNER with a reason
  const priceChanged =
    (data.basePrice !== undefined && data.basePrice !== existing.basePrice) ||
    (data.travelCharge !== undefined && data.travelCharge !== existing.travelCharge) ||
    (data.discount !== undefined && data.discount !== existing.discount);

  if (existing.status === "COMPLETED" && priceChanged) {
    if (session.user.role !== "PARTNER") {
      return {
        ok: false,
        error: "Only partners can edit pricing on completed bookings.",
      };
    }
    if (!data.priceEditReason || !data.priceEditReason.trim()) {
      return {
        ok: false,
        error: "A reason is required when modifying prices of completed bookings.",
      };
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.booking.update({
      where: { id: data.id },
      data: {
        clientName: data.clientName,
        phone: data.phone,
        city: data.city,
        venue: data.venue,
        mapLink: data.mapLink,
        eventDate: data.eventDate,
        startTime: data.startTime,
        endTime: data.endTime,
        packageId: data.packageId,
        packageName: data.packageName,
        basePrice: data.basePrice,
        travelCharge: data.travelCharge,
        discount: data.discount,
        type: data.type,
        payOnEvent: data.payOnEvent,
        dayContact: data.dayContact,
        notes: data.notes,
        printSize: data.printSize,
        printsUsed: data.printsUsed,
      },
    });

    if (priceChanged) {
      await tx.bookingActivity.create({
        data: {
          bookingId: data.id,
          userId: session.user.id,
          type: "PRICE_EDITED",
          message: `Pricing updated. Base: ₹${res.basePrice}, Travel: ₹${res.travelCharge}, Discount: ₹${res.discount}. Reason: ${
            data.priceEditReason || "Manual adjustment"
          }`,
        },
      });
    } else {
      await tx.bookingActivity.create({
        data: {
          bookingId: data.id,
          userId: session.user.id,
          type: "NOTE",
          message: "Booking details updated",
        },
      });
    }

    return res;
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${existing.code}`);
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: updated.id, code: updated.code },
  };
}

export async function changeBookingStatus(
  rawInput: unknown
): Promise<ActionResult<{ id: string; status: string }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = changeBookingStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const existing = await db.booking.findUnique({
    where: { id: data.bookingId },
    include: { payments: true },
  });

  if (!existing) {
    return { ok: false, error: "Booking not found" };
  }

  // 1. Verify state machine
  if (!canMove(existing.status, data.status)) {
    return {
      ok: false,
      error: `Cannot transition booking status from ${existing.status} to ${data.status}.`,
    };
  }

  // 2. CONFIRMED from OPTION requires advance payment or payOnEvent
  if (existing.status === "OPTION" && data.status === "CONFIRMED") {
    const livePaid = existing.payments
      .filter((p) => !p.voidedAt)
      .reduce((sum, p) => sum + (p.kind === "REFUND" ? -p.amount : p.amount), 0);

    if (livePaid <= 0 && !existing.payOnEvent) {
      return {
        ok: false,
        error:
          "Confirmation from Option requires either an advance payment or payOnEvent to be true.",
      };
    }
  }

  // 3. POSTPONED to CONFIRMED requires a new non-past date
  let newDate = existing.eventDate;
  if (existing.status === "POSTPONED" && data.status === "CONFIRMED") {
    if (!data.newEventDate || data.newEventDate < startOfTodayIST(new Date())) {
      return {
        ok: false,
        error:
          "A new non-past event date is required to confirm a postponed booking.",
      };
    }
    newDate = data.newEventDate;
  }

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.booking.update({
      where: { id: data.bookingId },
      data: {
        status: data.status,
        eventDate: newDate,
        printSize: data.status === "COMPLETED" ? data.printSize : existing.printSize,
        printsUsed: data.status === "COMPLETED" ? data.printsUsed : existing.printsUsed,
      },
    });

    await tx.bookingActivity.create({
      data: {
        bookingId: data.bookingId,
        userId: session.user.id,
        type: "STATUS_CHANGED",
        message: `Status changed from ${existing.status} to ${data.status}${
          data.reason ? ` (${data.reason})` : ""
        }`,
      },
    });

    return res;
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${existing.code}`);
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: updated.id, status: updated.status },
  };
}

export async function recordPayment(
  rawInput: unknown
): Promise<ActionResult<{ id: string; amount: number; balance: number }>> {
  const session = await requireRole(["PARTNER", "SALES"]);

  const parsed = recordPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const booking = await db.booking.findUnique({
    where: { id: data.bookingId },
    include: { payments: true },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found" };
  }

  // Validate payment rules & warnings
  const validation = validatePayment(data, booking, booking.payments, new Date());
  if (!validation.valid) {
    return {
      ok: false,
      error: "Payment validation failed",
      errors: validation.errors,
    };
  }

  // Atomic creation and balance re-calculation inside transaction
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        paidOn: data.paidOn,
        kind: data.kind,
        mode: data.mode,
        receivedBy: data.receivedBy,
        reference: data.reference,
        note: data.note,
      },
    });

    // Fetch live payments inside transaction to recompute balance safely
    const allLive = await tx.payment.findMany({
      where: { bookingId: data.bookingId, voidedAt: null },
      select: { amount: true, kind: true },
    });

    const balance = balanceDue(booking, allLive);

    await tx.bookingActivity.create({
      data: {
        bookingId: data.bookingId,
        userId: session.user.id,
        type: "PAYMENT_ADDED",
        message: `Payment of ₹${data.amount.toLocaleString(
          "en-IN"
        )} (${data.kind}) recorded via ${data.mode}. Remaining balance: ₹${balance.toLocaleString(
          "en-IN"
        )}.`,
      },
    });

    return { payment, balance };
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.code}`);
  revalidatePath("/collections");
  revalidatePath("/overview");

  return {
    ok: true,
    data: {
      id: result.payment.id,
      amount: result.payment.amount,
      balance: result.balance,
    },
    warnings: validation.warnings,
  };
}

export async function voidPayment(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  // ONLY PARTNER role can void a payment
  const session = await requireRole(["PARTNER"]);

  const parsed = voidPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const payment = await db.payment.findUnique({
    where: { id: data.paymentId },
    include: { booking: true },
  });

  if (!payment) {
    return { ok: false, error: "Payment not found" };
  }

  if (payment.voidedAt) {
    return { ok: false, error: "This payment is already voided" };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: data.paymentId },
      data: {
        voidedAt: new Date(),
        voidedById: session.user.id,
        voidReason: data.reason,
      },
    });

    await tx.bookingActivity.create({
      data: {
        bookingId: payment.bookingId,
        userId: session.user.id,
        type: "PAYMENT_VOIDED",
        message: `Payment of ₹${payment.amount.toLocaleString(
          "en-IN"
        )} voided by ${session.user.name}. Reason: ${data.reason}`,
      },
    });
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${payment.booking.code}`);
  revalidatePath("/collections");
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: payment.id },
  };
}

export async function cancelBooking(
  rawInput: unknown
): Promise<ActionResult<{ id: string; refundAmount: number }>> {
  // ONLY PARTNER role can cancel with refund / cancel booking
  const session = await requireRole(["PARTNER"]);

  const parsed = cancelBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const booking = await db.booking.findUnique({
    where: { id: data.bookingId },
    include: { payments: true },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found" };
  }

  if (!canMove(booking.status, "CANCELLED")) {
    return {
      ok: false,
      error: `Cannot cancel a booking in status ${booking.status}.`,
    };
  }

  await db.$transaction(async (tx) => {
    // If refund amount is positive, create a single REFUND payment
    if (data.refundAmount > 0) {
      await tx.payment.create({
        data: {
          bookingId: data.bookingId,
          amount: data.refundAmount,
          kind: "REFUND",
          mode: data.refundMode || "UPI",
          paidOn: new Date(),
          receivedBy: session.user.name,
          note: `Refund on cancellation: ${data.reason}`,
        },
      });
    }

    await tx.booking.update({
      where: { id: data.bookingId },
      data: { status: "CANCELLED" },
    });

    await tx.bookingActivity.create({
      data: {
        bookingId: data.bookingId,
        userId: session.user.id,
        type: "STATUS_CHANGED",
        message: `Booking cancelled. Reason: ${data.reason}.${
          data.refundAmount > 0
            ? ` Refund of ₹${data.refundAmount.toLocaleString("en-IN")} recorded.`
            : " No refund issued."
        }`,
      },
    });
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.code}`);
  revalidatePath("/collections");
  revalidatePath("/overview");

  return {
    ok: true,
    data: { id: booking.id, refundAmount: data.refundAmount },
  };
}
