import { db } from "@/lib/db";
import { parseISODateIST } from "@/lib/dates";
import { buildMonthGrid } from "./grid";
import { findClashes, type BookingForClash } from "./clashes";

export async function getCalendarBookings(month: string, city?: string) {
  const [y, m] = month.split("-").map(Number);
  const grid = buildMonthGrid(y, m);
  const startDate = parseISODateIST(grid[0].iso) ?? new Date(grid[0].iso);
  const endDate = new Date(
    (parseISODateIST(grid[41].iso) ?? new Date(grid[41].iso)).getTime() + 86_400_000 - 1
  );

  const bookings = await db.booking.findMany({
    where: {
      status: { not: "CANCELLED" },
      eventDate: {
        gte: startDate,
        lte: endDate,
      },
      ...(city ? { city } : {}),
    },
    select: {
      id: true,
      code: true,
      clientName: true,
      phone: true,
      city: true,
      venue: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      status: true,
      unit: true,
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });

  const clashMap = findClashes(bookings as BookingForClash[]);

  return bookings.map((b) => {
    const clash = clashMap.get(b.id);
    return {
      ...b,
      hasClash: clash?.hasClash ?? false,
      noUnit: clash?.noUnit ?? !b.unit,
      clashingWith: clash?.clashingWith ?? [],
    };
  });
}
