/**
 * Lookup maps for import pipeline:
 * - STATUS_MAP: sheet payment-status labels → structured interpretation
 * - CITY_MAP: spelling variants → canonical city name
 * - CATEGORY_GROUP: expense remark keywords → ExpenseCategory enum value
 */

import type { ExpenseCategory } from "@/generated/prisma";

// Sheet payment/status labels for bookings
export type SheetPaymentStatus =
  | "FULLY_PAID"      // considered completed
  | "ADVANCE_PAID"    // partial – flag disagreement if sheet says "Paid"
  | "UNPAID"
  | "UNKNOWN";

export const STATUS_MAP: Record<string, SheetPaymentStatus> = {
  "paid":          "FULLY_PAID",
  "fully paid":    "FULLY_PAID",
  "full paid":     "FULLY_PAID",
  "advance paid":  "ADVANCE_PAID",
  "partial":       "ADVANCE_PAID",
  "partial paid":  "ADVANCE_PAID",
  "unpaid":        "UNPAID",
  "pending":       "UNPAID",
  "not paid":      "UNPAID",
  "":              "UNKNOWN",
};

export function parseSheetStatus(raw: unknown): SheetPaymentStatus {
  if (raw === null || raw === undefined) return "UNKNOWN";
  const key = String(raw).toLowerCase().trim();
  return STATUS_MAP[key] ?? "UNKNOWN";
}

// Canonical city names (add more as needed)
export const CITY_MAP: Record<string, string> = {
  // Bengaluru variants
  "bangalore":   "Bengaluru",
  "bengaluru":   "Bengaluru",
  "blr":         "Bengaluru",
  "bengalore":   "Bengaluru",
  "bangaluru":   "Bengaluru",
  // Mysore variants
  "mysore":      "Mysuru",
  "mysuru":      "Mysuru",
  "mysooru":     "Mysuru",
  // Mangalore variants
  "mangalore":   "Mangaluru",
  "mangaluru":   "Mangaluru",
  "mlr":         "Mangaluru",
  // Others
  "hubli":       "Hubballi",
  "hubballi":    "Hubballi",
  "dharwad":     "Dharwad",
  "hassan":      "Hassan",
  "tumkur":      "Tumakuru",
  "tumakuru":    "Tumakuru",
};

export function canonicalCity(raw: unknown): string | null {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim();
  return CITY_MAP[key] ?? (String(raw).trim() || null);
}

// Map expense remark keywords → ExpenseCategory
// First matching entry wins; order matters (most specific first)
export const CATEGORY_KEYWORDS: Array<{ re: RegExp; category: ExpenseCategory }> = [
  { re: /travel|fuel|cab|auto|transport|toll|petrol|diesel/i,  category: "TRAVEL" },
  { re: /food|lunch|dinner|snack|meal|tea|coffee|refresh/i,   category: "FOOD" },
  { re: /print|album|photo|frame|canvas|book/i,               category: "PRINTING" },
  { re: /vendor|operator|assistant|helper|staff|labour|labor/i, category: "VENDOR" },
  { re: /rent|venue|hall|space/i,                             category: "VENUE" },
  { re: /equipment|gear|light|camera|lens|tripod|battery/i,  category: "EQUIPMENT" },
  { re: /market|advertis|promo|social|instagram|facebook/i,  category: "MARKETING" },
  { re: /salary|wage|pay|staff/i,                            category: "SALARY" },
  { re: /software|subscr|domain|host|saas/i,                 category: "SOFTWARE" },
  { re: /phone|mobile|sim|data|recharge/i,                   category: "PHONE" },
  { re: /office|stationary|stationery|supply|pen|paper/i,   category: "OFFICE" },
  { re: /withdraw|personal|draw/i,                            category: "OTHER" },
];

export function guessCategory(remark: unknown): ExpenseCategory | null {
  if (!remark) return null;
  const s = String(remark);
  for (const { re, category } of CATEGORY_KEYWORDS) {
    if (re.test(s)) return category;
  }
  return null;
}
