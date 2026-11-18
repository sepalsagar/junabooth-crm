import type { ExpenseCategory } from "@/generated/prisma/client";

export const EXPENSE_GROUPS = ["all", "event-day", "setup", "operators", "marketing", "general"] as const;
export type ExpenseGroup = (typeof EXPENSE_GROUPS)[number];

export const CATEGORY_GROUP: Record<ExpenseCategory, Exclude<ExpenseGroup, "all">> = {
  TRANSPORT: "event-day",
  FOOD: "event-day",
  VENUE_CUT: "event-day",
  OPERATOR_FEE: "operators",
  EQUIPMENT: "setup",
  SOFTWARE: "setup",
  CARPENTRY: "setup",
  EMI: "setup",
  MARKETING: "marketing",
  CONSUMABLES: "general",
  ADMIN: "general",
  OTHER: "general",
};

export function categoriesOf(group: ExpenseGroup): ExpenseCategory[] {
  if (group === "all") return Object.keys(CATEGORY_GROUP) as ExpenseCategory[];
  return (Object.keys(CATEGORY_GROUP) as ExpenseCategory[]).filter(
    (category) => CATEGORY_GROUP[category] === group
  );
}
