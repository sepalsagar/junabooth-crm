import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { amountReceived, balanceDue, bookingTotal } from "@/lib/calc";
import { getISTParts, startOfTodayIST, toISODateStringIST } from "@/lib/dates";
import { ACTIVE_BOOKING_STATUSES, getActiveBookingFinancials } from "@/features/bookings/queries";
import { findClashes, type BookingForClash } from "@/features/calendar/clashes";
import { currentISTMonth, parseMonth } from "./filters";
import { fillMonths } from "./months";
import { cashPosition, type CashInputs, type CashPositionResult } from "@/features/capital/calc";
import { getFirmCapitalSummary } from "@/features/capital/queries";
import { leadConversion, type SourceConversion } from "@/features/reports/conversion";
import { monthlyPL, type MonthlyPLResult } from "@/features/reports/pl";
import { eventProfit } from "@/features/expenses/profit";

export async function getBalanceToCollect(): Promise<number> {
  const rows = await getActiveBookingFinancials();
  let total = 0;
  for (const b of rows) {
    const bal = balanceDue(b, b.payments);
    if (bal > 0) total += bal;
  }
  return total;
}

export async function getReceivedToDate(): Promise<number> {
  const rows = await getActiveBookingFinancials();
  let total = 0;
  for (const b of rows) {
    total += amountReceived(b.payments);
  }
  return total;
}

export async function getBookedThisMonth(month?: string, city?: string): Promise<{ count: number; total: number }> {
  const targetMonth = month ? parseMonth(month) : currentISTMonth();
  const rows = await db.booking.findMany({
    where: {
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...(city ? { city } : {}),
    },
    select: {
      eventDate: true,
      basePrice: true,
      travelCharge: true,
      discount: true,
    },
  });

  const monthRows = rows.filter((r) =>
    toISODateStringIST(new Date(r.eventDate)).startsWith(targetMonth)
  );

  const total = monthRows.reduce((sum, r) => sum + bookingTotal(r), 0);
  return { count: monthRows.length, total };
}

export async function getUpcomingEvents(limit = 10, city?: string) {
  const now = new Date();
  const startToday = startOfTodayIST(now);

  const bookings = await db.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "IN_PROGRESS", "OPTION"] },
      eventDate: { gte: startToday },
      ...(city ? { city } : {}),
    },
    orderBy: { eventDate: "asc" },
    take: limit,
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
      unit: true,
      status: true,
      basePrice: true,
      travelCharge: true,
      discount: true,
      payments: {
        select: {
          amount: true,
          kind: true,
          voidedAt: true,
        },
      },
    },
  });

  // Check clashes among upcoming bookings
  const clashMap = findClashes(bookings as BookingForClash[]);

  return bookings.map((b) => {
    const balance = balanceDue(b, b.payments);
    const total = bookingTotal(b);
    const clashInfo = clashMap.get(b.id);

    return {
      ...b,
      totalAmount: total,
      balance,
      hasClash: clashInfo?.hasClash ?? false,
      noUnit: clashInfo?.noUnit ?? !b.unit,
      clashingWith: clashInfo?.clashingWith ?? [],
    };
  });
}

export async function getCashInputs(): Promise<CashInputs> {
  const [capSummary, livePaymentsRows, liveExpensesRows] =
    await Promise.all([
      getFirmCapitalSummary(),
      db.payment.findMany({
        where: { voidedAt: null },
        select: { amount: true, kind: true },
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { voidedAt: null },
      }),
    ]);

  const injected = capSummary.firmInjected;
  const withdrawn = capSummary.firmWithdrawn;
  const expenses = liveExpensesRows._sum.amount ?? 0;

  let received = 0;
  for (const p of livePaymentsRows) {
    if (p.kind === "REFUND") {
      received -= p.amount;
    } else {
      received += p.amount;
    }
  }

  return {
    injected,
    received,
    expenses,
    withdrawn,
  };
}

export async function getCashPosition(): Promise<CashPositionResult> {
  const inputs = await getCashInputs();
  return cashPosition(inputs);
}

export async function getRevenueByMonth(city?: string) {
  // Query revenue grouped by IST month using parameterized tagged template
  type Row = { month: string; completed: number; upcoming: number };

  const cityFilter = city ? Prisma.sql`AND "city" = ${city}` : Prisma.empty;

  const rows = await db.$queryRaw<Row[]>`
    SELECT
      to_char(date_trunc('month', "eventDate" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM') AS "month",
      COALESCE(SUM(CASE WHEN "status" = 'COMPLETED' THEN ("basePrice" + "travelCharge" - "discount") ELSE 0 END), 0)::int AS "completed",
      COALESCE(SUM(CASE WHEN "status" IN ('CONFIRMED', 'IN_PROGRESS') THEN ("basePrice" + "travelCharge" - "discount") ELSE 0 END), 0)::int AS "upcoming"
    FROM "Booking"
    WHERE "status" != 'CANCELLED'
    ${cityFilter}
    GROUP BY date_trunc('month', "eventDate" AT TIME ZONE 'Asia/Kolkata')
    ORDER BY "month" ASC
  `;

  // Determine span: past 4 months to next 3 months around current IST month
  const now = new Date();
  const { year, month } = getISTParts(now); // month is 0-11
  const startMonthDate = new Date(Date.UTC(year, month - 4, 1));
  const endMonthDate = new Date(Date.UTC(year, month + 3, 1));

  const fromMonth = `${startMonthDate.getUTCFullYear()}-${String(startMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const toMonth = `${endMonthDate.getUTCFullYear()}-${String(endMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;

  return fillMonths(rows, fromMonth, toMonth, (m) => ({
    month: m,
    completed: 0,
    upcoming: 0,
  }));
}

export async function getEventsByCity() {
  const rows = await db.booking.groupBy({
    by: ["city"],
    _count: { id: true },
    where: {
      status: { not: "CANCELLED" },
      city: { not: null },
    },
    orderBy: {
      _count: { id: "desc" },
    },
  });

  return rows.map((r) => ({
    city: r.city ?? "Other",
    count: r._count.id,
  }));
}

export async function getLeadsByStatus() {
  const rows = await db.lead.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  return rows.map((r) => ({
    status: r.status,
    count: r._count.id,
  }));
}

export async function getMonthlyPLData(month: string): Promise<MonthlyPLResult> {
  const targetMonth = parseMonth(month);

  // Fetch bookings and live expenses
  const [bookings, unlinkedExpenses] = await Promise.all([
    db.booking.findMany({
      select: {
        id: true,
        eventDate: true,
        status: true,
        basePrice: true,
        travelCharge: true,
        discount: true,
        printSize: true,
        printsUsed: true,
        updatedAt: true,
        payments: {
          select: {
            amount: true,
            kind: true,
            voidedAt: true,
            paidOn: true,
          },
        },
        expenses: {
          select: {
            category: true,
            amount: true,
            voidedAt: true,
          },
        },
      },
    }),
    db.expense.findMany({
      where: {
        bookingId: null,
        voidedAt: null,
      },
      select: {
        id: true,
        category: true,
        amount: true,
        spentOn: true,
        voidedAt: true,
      },
    }),
  ]);

  const plBookings = bookings.map((b) => ({
    ...b,
    cancelledAt: b.status === "CANCELLED" ? b.updatedAt : null,
  }));

  return monthlyPL(targetMonth, {
    bookings: plBookings,
    unlinkedExpenses,
  });
}

export async function getConversionBySource(): Promise<SourceConversion[]> {
  const rows = await db.lead.findMany({
    select: {
      source: true,
      status: true,
    },
  });

  return leadConversion(rows);
}

export async function getCitySummary() {
  const bookings = await db.booking.findMany({
    where: {
      status: { in: ACTIVE_BOOKING_STATUSES },
      city: { not: null },
    },
    select: {
      city: true,
      basePrice: true,
      travelCharge: true,
      discount: true,
      status: true,
      printSize: true,
      printsUsed: true,
      payments: {
        select: {
          amount: true,
          kind: true,
          voidedAt: true,
        },
      },
      expenses: {
        select: {
          category: true,
          amount: true,
          voidedAt: true,
        },
      },
    },
  });

  const cityMap = new Map<
    string,
    { events: number; billed: number; directCosts: number }
  >();

  for (const b of bookings) {
    const city = b.city!;
    if (!cityMap.has(city)) {
      cityMap.set(city, { events: 0, billed: 0, directCosts: 0 });
    }
    const stat = cityMap.get(city)!;
    stat.events++;
    const total = bookingTotal(b);
    stat.billed += total;

    const profit = eventProfit(b, b.expenses, b.payments);
    stat.directCosts += profit.directCosts;
  }

  const result = [];
  for (const [city, stat] of cityMap.entries()) {
    const avgDealSize = stat.events > 0 ? Math.round(stat.billed / stat.events) : 0;
    const grossProfit = stat.billed - stat.directCosts;
    const grossMargin =
      stat.billed > 0 ? Math.round((grossProfit / stat.billed) * 1000) / 10 : null;

    result.push({
      city,
      events: stat.events,
      billed: stat.billed,
      avgDealSize,
      grossProfit,
      grossMargin,
    });
  }

  return result.sort((a, b) => b.events - a.events);
}
