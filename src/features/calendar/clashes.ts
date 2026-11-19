import type { BookingStatus, BoothUnit } from "@/generated/prisma/client";
import { toISODateStringIST } from "@/lib/dates";

export interface BookingForClash {
  id: string;
  code?: string;
  clientName?: string;
  eventDate: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  unit?: BoothUnit | null;
  status: BookingStatus;
}

export interface ClashResult {
  bookingId: string;
  hasClash: boolean;
  clashingWith: string[]; // IDs of bookings it clashes with
  noUnit: boolean;
}

function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const parts = t.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function timesOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null
): boolean {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);

  // If times missing on either, same date = possible clash
  if (sA === null || eA === null || sB === null || eB === null) {
    return true;
  }

  // Standard interval overlap: sA < eB && sB < eA
  return sA < eB && sB < eA;
}

export function findClashes(bookings: BookingForClash[]): Map<string, ClashResult> {
  const result = new Map<string, ClashResult>();

  // Filter out CANCELLED bookings
  const activeBookings = bookings.filter((b) => b.status !== "CANCELLED");

  // Initialize all active bookings in result map
  for (const b of activeBookings) {
    result.set(b.id, {
      bookingId: b.id,
      hasClash: false,
      clashingWith: [],
      noUnit: !b.unit,
    });
  }

  // Compare every pair
  for (let i = 0; i < activeBookings.length; i++) {
    for (let j = i + 1; j < activeBookings.length; j++) {
      const b1 = activeBookings[i];
      const b2 = activeBookings[j];

      // Must both have a unit assigned to clash with each other on unit
      if (!b1.unit || !b2.unit) continue;
      if (b1.unit !== b2.unit) continue;

      // Must be same IST date
      const date1 = toISODateStringIST(new Date(b1.eventDate));
      const date2 = toISODateStringIST(new Date(b2.eventDate));
      if (date1 !== date2) continue;

      // Check time overlap
      if (timesOverlap(b1.startTime, b1.endTime, b2.startTime, b2.endTime)) {
        const r1 = result.get(b1.id)!;
        const r2 = result.get(b2.id)!;

        r1.hasClash = true;
        if (!r1.clashingWith.includes(b2.id)) {
          r1.clashingWith.push(b2.id);
        }

        r2.hasClash = true;
        if (!r2.clashingWith.includes(b1.id)) {
          r2.clashingWith.push(b1.id);
        }
      }
    }
  }

  return result;
}
