import { requireRole } from "@/lib/auth-guards";
import { parseMonth } from "@/features/metrics/filters";
import {
  getCitySummary,
  getConversionBySource,
  getMonthlyPLData,
} from "@/features/metrics/queries";
import { ReportsView } from "@/features/reports/components/reports-view";

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  // STRICT SERVER ROLE GUARD: PARTNER ONLY
  await requireRole(["PARTNER"]);

  const params = await searchParams;
  const rawMonth = typeof params.month === "string" ? params.month : undefined;
  const currentMonth = parseMonth(rawMonth);

  const [plData, conversionData, cityData] = await Promise.all([
    getMonthlyPLData(currentMonth),
    getConversionBySource(),
    getCitySummary(),
  ]);

  return (
    <ReportsView
      currentMonth={currentMonth}
      plData={plData}
      conversionData={conversionData}
      cityData={cityData}
    />
  );
}
