import { db } from "@/lib/db";
import {
  amountReceived,
  balanceDue,
  bookingTotal,
  paymentStatus,
  type PaymentStatus,
} from "@/lib/calc";
import { endOfWeekIST, startOfTodayIST } from "@/lib/dates";
import { buildBookingWhere, getAggregatedBookingIds } from "./filters";
import { isBelowRate } from "./rules";
import type { BookingFilters } from "./schema";
import type { BookingStatus, Prisma } from "@/generated/prisma/client";
import { attachExpensesForRole, can, type Role } from "@/lib/permissions";
import { requireUser } from "@/lib/auth-guards";
import { getBookingCosts } from "@/features/expenses/queries";

export const BOOKINGS_PAGE_SIZE = 20;

// Shared definition of active bookings with financial commitments
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
];

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(status);
}

function getBookingOrderBy(
  sort?: string
): Prisma.BookingOrderByWithRelationInput {
  switch (sort) {
    case "eventDate_desc":
      return { eventDate: "desc" };
    case "newest":
      return { createdAt: "desc" };
    case "amount_desc":
      return { basePrice: "desc" };
    case "amount_asc":
      return { basePrice: "asc" };
    case "eventDate_asc":
    default:
      return { eventDate: "asc" };
  }
}

export async function getBookings(filters: BookingFilters) {
  const now = new Date();

  // If aggregated payment status, balance due, or below-rate filter is requested
  let filteredIds: string[] | undefined;
  if (
    (filters.paymentStatus && filters.paymentStatus.length > 0) ||
    (filters.balanceDue && filters.balanceDue !== "all") ||
    filters.belowRate === true
  ) {
    filteredIds = await getAggregatedBookingIds(db, {
      paymentStatus: filters.paymentStatus,
      balanceDue: filters.balanceDue,
      belowRate: filters.belowRate,
    });
  }

  const where = buildBookingWhere(filters, now, filteredIds);
  const skip = (filters.page - 1) * BOOKINGS_PAGE_SIZE;
  const take = BOOKINGS_PAGE_SIZE;
  const orderBy = getBookingOrderBy(filters.sort);

  // Single transaction for findMany + count (no N+1)
  const [rows, total] = await db.$transaction([
    db.booking.findMany({
      where,
      skip,
      take,
      orderBy,
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
        packageName: true,
        basePrice: true,
        travelCharge: true,
        discount: true,
        type: true,
        status: true,
        payOnEvent: true,
        notes: true,
        sheetAdvanceReceived: true,
        sheetBalanceDue: true,
        sheetFinalReceived: true,
        sheetPaymentStatus: true,
        createdAt: true,
        package: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        lead: {
          select: {
            id: true,
            code: true,
          },
        },
        payments: {
          select: {
            amount: true,
            kind: true,
            voidedAt: true,
          },
        },
      },
    }),
    db.booking.count({ where }),
  ]);

  // Compute live received, balance, and payment status per row (honoring sheet ledger fields)
  const bookings = rows.map((b) => {
    const advance = b.sheetAdvanceReceived ?? 0;
    const finalRecd = b.sheetFinalReceived ?? 0;
    const sheetReceived = advance + finalRecd;
    const paymentsReceived = amountReceived(b.payments);
    const received = b.payments.length > 0 ? paymentsReceived : sheetReceived;
    const balance = b.sheetBalanceDue !== null ? b.sheetBalanceDue : balanceDue(b, b.payments);
    const status = b.sheetPaymentStatus ? (b.sheetPaymentStatus as any) : paymentStatus(b, b.payments, b.payOnEvent);
    const belowRate = isBelowRate(b.basePrice, b.package);
    const totalAmount = b.basePrice + (b.travelCharge ?? 0) - (b.discount ?? 0);

    return {
      ...b,
      leadCode: b.lead?.code ?? null,
      region: b.city,
      advance,
      finalRecd,
      totalAmount,
      received,
      balance,
      paymentStatus: status,
      isBelowRate: belowRate,
    };
  });

  return {
    bookings,
    total,
    page: filters.page,
    pageSize: BOOKINGS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE)),
  };
}

export async function getBooking(code: string) {
  const { user } = await requireUser();
  const role = user.role as Role;
  const booking = await db.booking.findUnique({
    where: { code },
    include: {
      package: true,
      lead: {
        select: {
          id: true,
          code: true,
          status: true,
          source: true,
        },
      },
      payments: {
        orderBy: { paidOn: "desc" },
        include: {
          voidedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!booking) return null;

  const totalAmount = bookingTotal(booking);
  const received = amountReceived(booking.payments);
  const balance = balanceDue(booking, booking.payments);
  const status = paymentStatus(booking, booking.payments, booking.payOnEvent);
  const belowRate = isBelowRate(booking.basePrice, booking.package);

  let hasClash = false;
  let clashWith: string[] = [];
  if (booking.unit && booking.status !== "CANCELLED") {
    const nearby = await db.booking.findMany({
      where: {
        status: { not: "CANCELLED" },
        id: { not: booking.id },
        unit: booking.unit,
        eventDate: {
          gte: new Date(booking.eventDate.getTime() - 86_400_000),
          lte: new Date(booking.eventDate.getTime() + 86_400_000),
        },
      },
      select: {
        id: true,
        code: true,
        clientName: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        unit: true,
        status: true,
      },
    });

    const { findClashes } = await import("@/features/calendar/clashes");
    const clashMap = findClashes([booking, ...nearby]);
    const info = clashMap.get(booking.id);
    if (info?.hasClash) {
      hasClash = true;
      clashWith = info.clashingWith;
    }
  }

  const result = {
    ...booking,
    totalAmount,
    received,
    balance,
    paymentStatus: status,
    isBelowRate: belowRate,
    hasClash,
    clashWith,
  };

  if (can(role, "expenses")) {
    const expenses = await getBookingCosts(booking.id);
    return attachExpensesForRole(role, result, expenses);
  }
  return result;
}

export async function getActiveBookingFinancials() {
  return db.booking.findMany({
    where: { status: { in: ACTIVE_BOOKING_STATUSES } },
    orderBy: { eventDate: "asc" },
    select: {
      id: true,
      code: true,
      clientName: true,
      phone: true,
      city: true,
      venue: true,
      eventDate: true,
      status: true,
      type: true,
      payOnEvent: true,
      basePrice: true,
      travelCharge: true,
      discount: true,
      sheetAdvanceReceived: true,
      sheetBalanceDue: true,
      sheetFinalReceived: true,
      sheetPaymentStatus: true,
      payments: {
        select: { amount: true, kind: true, voidedAt: true },
      },
    },
  });
}

export interface CollectionItem {
  id: string;
  code: string;
  clientName: string;
  phone: string;
  city: string | null;
  venue: string | null;
  eventDate: Date;
  status: BookingStatus;
  type: string;
  payOnEvent: boolean;
  totalAmount: number;
  received: number;
  balance: number;
  paymentStatus: PaymentStatus;
  view: "week" | "overdue";
}

export async function getCollections(view: "week" | "overdue"): Promise<CollectionItem[]> {
  const now = new Date();
  const startToday = startOfTodayIST(now);
  const endWeek = endOfWeekIST(now);
  const activeRows = await getActiveBookingFinancials();

  const activeWithBalance = activeRows
    .map((b) => {
      const received = amountReceived(b.payments);
      const balance = balanceDue(b, b.payments);
      const status = paymentStatus(b, b.payments, b.payOnEvent);
      const totalAmount = bookingTotal(b);

      return {
        ...b,
        totalAmount,
        received,
        balance,
        paymentStatus: status,
      };
    })
    .filter((b) => b.balance > 0);

  if (view === "week") {
    // Due this week: event date between today and end of week IST
    return activeWithBalance
      .filter((b) => b.eventDate >= startToday && b.eventDate <= endWeek)
      .map((b) => ({ ...b, view: "week" }));
  } else {
    // Overdue: event has already happened (eventDate < startToday) or COMPLETED with unpaid balance
    return activeWithBalance
      .filter((b) => b.eventDate < startToday || b.status === "COMPLETED")
      .map((b) => ({ ...b, view: "overdue" }));
  }
}

export async function getCollectionTotals(): Promise<{
  dueThisWeek: number;
  overdue: number;
}> {
  const [thisWeekItems, overdueItems] = await Promise.all([
    getCollections("week"),
    getCollections("overdue"),
  ]);

  const dueThisWeek = thisWeekItems.reduce((sum, item) => sum + item.balance, 0);
  const overdue = overdueItems.reduce((sum, item) => sum + item.balance, 0);

  return { dueThisWeek, overdue };
}

export async function getOverviewMoney(): Promise<{
  balanceToCollect: number;
  receivedToDate: number;
}> {
  const rows = await getActiveBookingFinancials();

  let balanceToCollect = 0;
  let receivedToDate = 0;

  for (const b of rows) {
    const advance = b.sheetAdvanceReceived ?? 0;
    const finalRecd = b.sheetFinalReceived ?? 0;
    const paymentsReceived = amountReceived(b.payments);
    const received = b.payments.length > 0 ? paymentsReceived : (advance + finalRecd);
    const balance = b.sheetBalanceDue !== null ? b.sheetBalanceDue : balanceDue(b, b.payments);

    receivedToDate += received;
    if (balance > 0) {
      balanceToCollect += balance;
    }
  }

  return { balanceToCollect, receivedToDate };
}

export async function getBookingFacets() {
  const [citiesRows, packages, statusCountRows, confirmedUpcomingRows] = await Promise.all([
    db.booking.findMany({
      select: { city: true },
      distinct: ["city"],
      where: { city: { not: null } },
      orderBy: { city: "asc" },
    }),
    db.package.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    }),
    db.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.booking.findMany({
      where: { status: "CONFIRMED" },
      select: {
        basePrice: true,
        sheetAdvanceReceived: true,
        sheetBalanceDue: true,
      },
    }),
  ]);

  const cities = citiesRows
    .map((r) => r.city?.trim())
    .filter((c): c is string => Boolean(c));

  const statusCounts = Object.fromEntries(
    statusCountRows.map((r) => [r.status, r._count._all])
  ) as Record<string, number>;

  const upcomingTotals = {
    count: confirmedUpcomingRows.length,
    packageFee: confirmedUpcomingRows.reduce((s, r) => s + r.basePrice, 0),
    advanceRecd: confirmedUpcomingRows.reduce((s, r) => s + (r.sheetAdvanceReceived ?? 0), 0),
    balanceDue: confirmedUpcomingRows.reduce((s, r) => s + (r.sheetBalanceDue ?? 0), 0),
  };

  return {
    cities,
    packages,
    statusCounts,
    upcomingTotals,
  };
}
