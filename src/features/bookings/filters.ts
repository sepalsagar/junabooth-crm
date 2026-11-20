import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { endOfWeekIST, startOfTodayIST } from "@/lib/dates";
import { normalizePhone } from "@/features/leads/phone";
import {
  bookingFiltersSchema,
  type BookingFilters,
  type BookingStatusType,
  type BookingTypeKind,
  type PaymentStatusFilterType,
} from "./schema";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function parseBookingFilters(
  rawParams: Record<string, string | string[] | undefined> | URLSearchParams
): BookingFilters {
  const params: Record<string, unknown> = {};

  if (rawParams instanceof URLSearchParams) {
    for (const key of Array.from(rawParams.keys())) {
      const all = rawParams.getAll(key);
      params[key] = all.length > 1 ? all : all[0];
    }
  } else {
    for (const [key, value] of Object.entries(rawParams)) {
      params[key] = value;
    }
  }

  const parsed = bookingFiltersSchema.safeParse(params);
  if (parsed.success) {
    return parsed.data;
  }

  return bookingFiltersSchema.parse({});
}

export function buildBookingWhere(
  filters: Partial<BookingFilters>,
  now: Date = new Date(),
  filteredBookingIds?: string[]
): Prisma.BookingWhereInput {
  const andClauses: Prisma.BookingWhereInput[] = [];

  // Aggregated ID filter (from SQL payment-status / balance-due query)
  if (filteredBookingIds !== undefined) {
    andClauses.push({ id: { in: filteredBookingIds } });
  }

  // Text search: clientName OR phone OR code (case-insensitive)
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    const cleanDigits = normalizePhone(q);
    const searchConditions: Prisma.BookingWhereInput[] = [
      { clientName: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { venue: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
    if (cleanDigits && cleanDigits !== q) {
      searchConditions.push({ phone: { contains: cleanDigits } });
    }
    andClauses.push({ OR: searchConditions });
  }

  // Status filtering
  if (filters.status && filters.status.length > 0) {
    andClauses.push({ status: { in: filters.status as BookingStatusType[] } });
  }

  // City filter
  if (filters.city) {
    andClauses.push({ city: { equals: filters.city, mode: "insensitive" } });
  }

  // Type filter (PAID, COLLAB, B2B)
  if (filters.type && filters.type.length > 0) {
    andClauses.push({ type: { in: filters.type as BookingTypeKind[] } });
  }

  // Date ranges
  if (filters.from || filters.to) {
    const eventDateClause: Prisma.DateTimeFilter = {};
    if (filters.from) eventDateClause.gte = filters.from;
    if (filters.to) eventDateClause.lte = filters.to;
    andClauses.push({ eventDate: eventDateClause });
  }

  // Timeframe presets (this-week, this-month, past) in IST
  if (filters.timeframe) {
    const startToday = startOfTodayIST(now);
    const endWeek = endOfWeekIST(now);

    // Calculate start of week (Monday) in IST
    const istDate = new Date(now.getTime() + IST_OFFSET_MS);
    const istDayOfWeek = istDate.getUTCDay(); // 0 = Sun, 1 = Mon ...
    const daysSinceMonday = (istDayOfWeek + 6) % 7;
    const startOfWeek = new Date(startToday.getTime() - daysSinceMonday * 86_400_000);

    // Calculate start and end of month in IST
    const year = istDate.getUTCFullYear();
    const month = istDate.getUTCMonth();
    const startOfMonth = new Date(
      Date.UTC(year, month, 1, 0, 0, 0, 0) - IST_OFFSET_MS
    );
    const endOfMonth = new Date(
      Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - IST_OFFSET_MS
    );

    if (filters.timeframe === "this-week") {
      andClauses.push({ eventDate: { gte: startOfWeek, lte: endWeek } });
    } else if (filters.timeframe === "this-month") {
      andClauses.push({ eventDate: { gte: startOfMonth, lte: endOfMonth } });
    } else if (filters.timeframe === "past") {
      andClauses.push({ eventDate: { lt: startToday } });
    }
  }

  if (andClauses.length === 0) return {};
  if (andClauses.length === 1) return andClauses[0];
  return { AND: andClauses };
}

// Parameterized SQL query tagged template for aggregated payment status and balance due
export async function getAggregatedBookingIds(
  client: Pick<PrismaClient, "$queryRaw">,
  filters: {
    paymentStatus?: PaymentStatusFilterType[];
    balanceDue?: "all" | "has_balance" | "no_balance";
    belowRate?: boolean;
  }
): Promise<string[]> {
  // If no aggregation filters are active, return all
  const hasStatusFilter = filters.paymentStatus && filters.paymentStatus.length > 0;
  const hasBalanceFilter = filters.balanceDue && filters.balanceDue !== "all";
  const hasBelowRateFilter = filters.belowRate === true;

  if (!hasStatusFilter && !hasBalanceFilter && !hasBelowRateFilter) {
    return [];
  }

  // Construct parameterized SQL using Prisma.sql tagged templates
  const rows = await client.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT b.id
    FROM "Booking" b
    LEFT JOIN "Payment" p ON p."bookingId" = b.id AND p."voidedAt" IS NULL
    LEFT JOIN "Package" pkg ON pkg.id = b."packageId"
    GROUP BY b.id, b."basePrice", b."travelCharge", b."discount", b."payOnEvent", b."sheetPaymentStatus", b."sheetBalanceDue", pkg.price
    HAVING 1=1
      ${
        hasStatusFilter
          ? Prisma.sql`
            AND (
              CASE
                WHEN b."sheetPaymentStatus" IS NOT NULL THEN
                  CASE
                    WHEN b."sheetPaymentStatus" ILIKE '%full%' OR b."sheetPaymentStatus" = 'Paid' OR b."sheetPaymentStatus" ILIKE '%collab%' OR b."sheetPaymentStatus" ILIKE '%promo%' THEN 'FULLY_PAID'
                    WHEN b."sheetPaymentStatus" ILIKE '%advance%' THEN 'ADVANCE_PAID'
                    WHEN b."sheetPaymentStatus" ILIKE '%pay on event%' THEN 'PAY_ON_EVENT'
                    ELSE 'AWAITING_ADVANCE'
                  END
                WHEN COALESCE(SUM(CASE WHEN p."kind" = 'REFUND' THEN -p.amount ELSE p.amount END), 0) > (b."basePrice" + b."travelCharge" - b."discount") THEN 'OVERPAID'
                WHEN COALESCE(SUM(CASE WHEN p."kind" = 'REFUND' THEN -p.amount ELSE p.amount END), 0) = (b."basePrice" + b."travelCharge" - b."discount") THEN 'FULLY_PAID'
                WHEN COALESCE(SUM(CASE WHEN p."kind" = 'REFUND' THEN -p.amount ELSE p.amount END), 0) > 0 THEN 'ADVANCE_PAID'
                WHEN b."payOnEvent" = TRUE THEN 'PAY_ON_EVENT'
                ELSE 'AWAITING_ADVANCE'
              END
            ) IN (${Prisma.join(filters.paymentStatus!)})
          `
          : Prisma.empty
      }
      ${
        filters.balanceDue === "has_balance"
          ? Prisma.sql`
            AND (
              CASE
                WHEN b."sheetBalanceDue" IS NOT NULL THEN b."sheetBalanceDue" > 0
                ELSE ((b."basePrice" + b."travelCharge" - b."discount") - COALESCE(SUM(CASE WHEN p."kind" = 'REFUND' THEN -p.amount ELSE p.amount END), 0)) > 0
              END
            )
          `
          : filters.balanceDue === "no_balance"
          ? Prisma.sql`
            AND (
              CASE
                WHEN b."sheetBalanceDue" IS NOT NULL THEN b."sheetBalanceDue" <= 0
                ELSE ((b."basePrice" + b."travelCharge" - b."discount") - COALESCE(SUM(CASE WHEN p."kind" = 'REFUND' THEN -p.amount ELSE p.amount END), 0)) <= 0
              END
            )
          `
          : Prisma.empty
      }
      ${
        hasBelowRateFilter
          ? Prisma.sql`
            AND pkg.price > 0 AND b."basePrice" < pkg.price
          `
          : Prisma.empty
      }
  `);

  return rows.map((r) => r.id);
}
