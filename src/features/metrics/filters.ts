import { z } from "zod";
import { getISTParts } from "@/lib/dates";

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format YYYY-MM");

export function currentISTMonth(now: Date = new Date()): string {
  const { year, month } = getISTParts(now);
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function parseMonth(monthStr?: string | null, now: Date = new Date()): string {
  if (!monthStr) return currentISTMonth(now);
  const parsed = monthSchema.safeParse(monthStr.trim());
  if (parsed.success) return parsed.data;
  return currentISTMonth(now);
}

export const overviewRangeSchema = z.enum([
  "this-month",
  "last-month",
  "season",
  "custom",
]);
export type OverviewRange = z.infer<typeof overviewRangeSchema>;

export const overviewFiltersSchema = z.object({
  range: overviewRangeSchema.default("this-month"),
  city: z.string().optional().nullable(),
  from: z.string().optional().nullable(),
  to: z.string().optional().nullable(),
});
export type OverviewFilters = z.infer<typeof overviewFiltersSchema>;

export function parseOverviewFilters(
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams
): OverviewFilters {
  const raw: Record<string, string | undefined> = {};
  if (searchParams) {
    if (typeof (searchParams as URLSearchParams).get === "function") {
      const sp = searchParams as URLSearchParams;
      raw.range = sp.get("range") ?? undefined;
      raw.city = sp.get("city") ?? undefined;
      raw.from = sp.get("from") ?? undefined;
      raw.to = sp.get("to") ?? undefined;
    } else {
      const obj = searchParams as Record<string, string | string[] | undefined>;
      raw.range = Array.isArray(obj.range) ? obj.range[0] : obj.range;
      raw.city = Array.isArray(obj.city) ? obj.city[0] : obj.city;
      raw.from = Array.isArray(obj.from) ? obj.from[0] : obj.from;
      raw.to = Array.isArray(obj.to) ? obj.to[0] : obj.to;
    }
  }

  const rangeResult = overviewRangeSchema.safeParse(raw.range);
  const range = rangeResult.success ? rangeResult.data : "this-month";
  const city = raw.city?.trim() ? raw.city.trim() : undefined;
  const from = raw.from?.trim() ? raw.from.trim() : undefined;
  const to = raw.to?.trim() ? raw.to.trim() : undefined;

  return { range, city, from, to };
}
