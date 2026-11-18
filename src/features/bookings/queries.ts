import { db } from "@/lib/db";
import {
  amountReceived,
  balanceDue,
  bookingTotal,
  paymentStatus,
  type PaymentStatus,
} from "@/lib/calc";
import { endOfTodayIST, endOfWeekIST, startOfTodayIST } from "@/lib/dates";
import { buildBookingWhere, getAggregatedBookingIds } from "./filters";
import { isBelowRate } from "./rules";
import type { BookingFilters } from "./schema";
import type { BookingStatus, Prisma } from "@/generated/prisma/client";

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

  // Compute live received, balance, and payment status per row
  const bookings = rows.map((b) => {
    const received = amountReceived(b.payments);
    const balance = balanceDue(b, b.payments);
    const status = paymentStatus(b, b.payments, b.payOnEvent);
    const belowRate = isBelowRate(b.basePrice, b.package);
    const totalAmount = bookingTotal(b);

    return {
      ...b,
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

  return {
    ...booking,
    totalAmount,
    received,
    balance,
    paymentStatus: status,
    isBelowRate: belowRate,
  };
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

  // Fetch all active bookings with live payments
  const rows = await db.booking.findMany({
    where: {
      status: { in: ACTIVE_BOOKING_STATUSES },
    },
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
      payments: {
        select: {
          amount: true,
          kind: true,
          voidedAt: true,
        },
      },
    },
  });

  const activeWithBalance = rows
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
  // Uses the same active booking definition
  const rows = await db.booking.findMany({
    where: {
      status: { in: ACTIVE_BOOKING_STATUSES },
    },
    select: {
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

  let balanceToCollect = 0;
  let receivedToDate = 0;

  for (const b of rows) {
    const received = amountReceived(b.payments);
    const balance = balanceDue(b, b.payments);

    receivedToDate += received;
    if (balance > 0) {
      balanceToCollect += balance;
    }
  }

  return { balanceToCollect, receivedToDate };
}

export async function getBookingFacets() {
  const [citiesRows, packages] = await Promise.all([
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
  ]);

  const cities = citiesRows
    .map((r) => r.city?.trim())
    .filter((c): c is string => Boolean(c));

  return {
    cities,
    packages,
  };
}
