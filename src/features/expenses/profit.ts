import type { BookingStatus, ExpenseCategory, PrintSize } from "@/generated/prisma/client";
import { bookingTotal } from "@/lib/calc";
import { amountReceived } from "@/lib/calc";

export const PRINT_COST_PAISE = {
  TWO_BY_SIX: 928,
  FOUR_BY_SIX: 2000,
} as const satisfies Record<PrintSize, number>;

export function consumablesEstimate(size: PrintSize | null | undefined, prints: number | null | undefined) {
  if (!size || !prints || prints < 0) return null;
  return Math.round((prints * PRINT_COST_PAISE[size]) / 100);
}

type ProfitCost = { category: ExpenseCategory; amount: number; voidedAt?: Date | null };
type ProfitPayment = { amount: number; kind: "ADVANCE" | "PART" | "FINAL" | "REFUND"; voidedAt?: Date | null };

export function eventProfit(
  booking: {
    basePrice: number;
    travelCharge: number;
    discount: number;
    status: BookingStatus;
    printSize?: PrintSize | null;
    printsUsed?: number | null;
  },
  costs: ProfitCost[],
  payments: ProfitPayment[]
) {
  const liveCosts = costs.filter((cost) => !cost.voidedAt);
  const directCategories = new Set<ExpenseCategory>([
    "OPERATOR_FEE", "TRANSPORT", "FOOD", "VENUE_CUT", "CONSUMABLES",
  ]);
  const directCosts = liveCosts.filter((cost) => directCategories.has(cost.category));
  const liveConsumables = directCosts.filter((cost) => cost.category === "CONSUMABLES");
  const estimate = consumablesEstimate(booking.printSize, booking.printsUsed);
  const hasLiveConsumables = liveConsumables.length > 0;
  const consumablesEstimateAmount = hasLiveConsumables ? null : estimate;
  const directCostAmount =
    directCosts.reduce((sum, cost) => sum + cost.amount, 0) +
    (consumablesEstimateAmount ?? 0);
  const revenue = booking.status === "CANCELLED"
    ? amountReceived(payments)
    : bookingTotal(booking);
  const profit = revenue - directCostAmount;
  const margin = revenue === 0 ? null : Math.round((profit / revenue) * 100);
  return {
    revenue,
    directCosts: directCostAmount,
    consumablesEstimate: consumablesEstimateAmount,
    profit,
    margin,
    costsIncomplete: booking.status === "COMPLETED" && directCosts.length === 0,
  };
}
