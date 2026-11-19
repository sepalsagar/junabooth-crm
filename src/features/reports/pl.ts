import type { BookingStatus, ExpenseCategory, PrintSize } from "@/generated/prisma/client";
import { eventProfit } from "@/features/expenses/profit";
import { CATEGORY_GROUP } from "@/features/expenses/groups";
import { amountReceived, bookingTotal } from "@/lib/calc";
import { toISODateStringIST } from "@/lib/dates";

export interface MonthlyPLBooking {
  id: string;
  eventDate: Date | string;
  status: BookingStatus;
  basePrice: number;
  travelCharge: number;
  discount: number;
  printSize?: PrintSize | null;
  printsUsed?: number | null;
  cancelledAt?: Date | string | null;
  payments: Array<{
    amount: number;
    kind: "ADVANCE" | "PART" | "FINAL" | "REFUND";
    voidedAt?: Date | string | null;
    paidOn?: Date | string;
  }>;
  expenses: Array<{
    category: ExpenseCategory;
    amount: number;
    voidedAt?: Date | string | null;
  }>;
}

export interface MonthlyPLExpense {
  id: string;
  bookingId?: string | null;
  category: ExpenseCategory;
  amount: number;
  spentOn: Date | string;
  voidedAt?: Date | string | null;
}

export interface MonthlyPLData {
  bookings: MonthlyPLBooking[];
  unlinkedExpenses: MonthlyPLExpense[];
}

export interface MonthPLBreakdown {
  month: string;
  revenue: number;
  directCosts: number;
  grossProfit: number;
  grossMargin: number | null; // e.g. 60.5 (%)
  overheads: {
    setup: number;
    marketing: number;
    general: number;
    total: number;
  };
  netProfit: number;
  netMargin: number | null; // e.g. 25.0 (%)
  bookingCount: number;
  cancelledCount: number;
}

export interface MonthlyPLResult {
  current: MonthPLBreakdown;
  previous: MonthPLBreakdown;
  comparison: {
    revenueDiff: number;
    directCostsDiff: number;
    grossProfitDiff: number;
    overheadsDiff: number;
    netProfitDiff: number;
  };
}

export function getPreviousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) {
    return `${y - 1}-12`;
  }
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function computeMonthBreakdown(
  month: string,
  data: MonthlyPLData
): MonthPLBreakdown {
  let revenue = 0;
  let directCosts = 0;
  let bookingCount = 0;
  let cancelledCount = 0;

  for (const b of data.bookings) {
    const eventDateStr = toISODateStringIST(new Date(b.eventDate));
    const isEventInMonth = eventDateStr.startsWith(month);

    if (b.status !== "CANCELLED") {
      if (isEventInMonth) {
        bookingCount++;
        revenue += bookingTotal(b);
        const mappedExpenses = b.expenses.map((e) => ({
          ...e,
          voidedAt: e.voidedAt ? new Date(e.voidedAt) : null,
        }));
        const mappedPayments = b.payments.map((p) => ({
          ...p,
          voidedAt: p.voidedAt ? new Date(p.voidedAt) : null,
        }));
        const profitCalc = eventProfit(b, mappedExpenses, mappedPayments);
        directCosts += profitCalc.directCosts;
      }
    } else {
      // Cancelled bookings contribute net received in the cancellation month
      let cancelMonth: string;
      if (b.cancelledAt) {
        cancelMonth = toISODateStringIST(new Date(b.cancelledAt)).slice(0, 7);
      } else {
        // Fallback: cancellation month matches event month or latest payment
        cancelMonth = eventDateStr.slice(0, 7);
      }

      if (cancelMonth === month) {
        cancelledCount++;
        const netReceived = amountReceived(b.payments);
        revenue += netReceived;
      }
    }
  }

  // Overheads: live unlinked expenses spent in this IST month
  let setup = 0;
  let marketing = 0;
  let general = 0;

  for (const e of data.unlinkedExpenses) {
    if (e.bookingId || e.voidedAt) continue;
    const spentDateStr = toISODateStringIST(new Date(e.spentOn));
    if (!spentDateStr.startsWith(month)) continue;

    const group = CATEGORY_GROUP[e.category];
    if (group === "setup") {
      setup += e.amount;
    } else if (group === "marketing") {
      marketing += e.amount;
    } else {
      general += e.amount;
    }
  }

  const totalOverheads = setup + marketing + general;
  const grossProfit = revenue - directCosts;
  const grossMargin =
    revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : null;
  const netProfit = grossProfit - totalOverheads;
  const netMargin =
    revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : null;

  return {
    month,
    revenue,
    directCosts,
    grossProfit,
    grossMargin,
    overheads: {
      setup,
      marketing,
      general,
      total: totalOverheads,
    },
    netProfit,
    netMargin,
    bookingCount,
    cancelledCount,
  };
}

export function monthlyPL(month: string, data: MonthlyPLData): MonthlyPLResult {
  const current = computeMonthBreakdown(month, data);
  const prevMonth = getPreviousMonth(month);
  const previous = computeMonthBreakdown(prevMonth, data);

  return {
    current,
    previous,
    comparison: {
      revenueDiff: current.revenue - previous.revenue,
      directCostsDiff: current.directCosts - previous.directCosts,
      grossProfitDiff: current.grossProfit - previous.grossProfit,
      overheadsDiff: current.overheads.total - previous.overheads.total,
      netProfitDiff: current.netProfit - previous.netProfit,
    },
  };
}
