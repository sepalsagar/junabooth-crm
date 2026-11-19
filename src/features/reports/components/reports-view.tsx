"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/format";
import type { MonthlyPLResult } from "../pl";
import type { SourceConversion } from "../conversion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FileSpreadsheetIcon,
  BuildingIcon,
  UsersIcon,
} from "lucide-react";

interface ReportsViewProps {
  currentMonth: string; // YYYY-MM
  plData: MonthlyPLResult;
  conversionData: SourceConversion[];
  cityData: Array<{
    city: string;
    events: number;
    billed: number;
    avgDealSize: number;
    grossMargin: number | null;
  }>;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getAdjacentMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  const newY = date.getUTCFullYear();
  const newM = date.getUTCMonth() + 1;
  return `${newY}-${String(newM).padStart(2, "0")}`;
}

export function ReportsView({
  currentMonth,
  plData,
  conversionData,
  cityData,
}: ReportsViewProps) {
  const router = useRouter();
  const [yearNum, monthNum] = currentMonth.split("-").map(Number);
  const monthTitle = `${MONTH_NAMES[monthNum - 1]} ${yearNum}`;

  const prevMonthStr = getAdjacentMonth(currentMonth, -1);
  const nextMonthStr = getAdjacentMonth(currentMonth, 1);

  const [prevY, prevM] = prevMonthStr.split("-").map(Number);
  const prevMonthTitle = `${MONTH_NAMES[prevM - 1]} ${prevY}`;

  const navigateMonth = (m: string) => {
    router.push(`/reports?month=${m}`);
  };

  const { current, previous, comparison } = plData;

  const renderDiff = (diff: number, isReversed = false) => {
    if (diff === 0) return <span className="text-muted-foreground">—</span>;
    const isPositive = diff > 0;
    const isGood = isReversed ? !isPositive : isPositive;

    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${
          isGood ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
        }`}
      >
        {isPositive ? <TrendingUpIcon className="h-3 w-3" /> : <TrendingDownIcon className="h-3 w-3" />}
        {isPositive ? "+" : ""}{inr(diff)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Month Selector and Export CSV Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth(prevMonthStr)}
              title="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth(nextMonthStr)}
              title="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>

          <h1 className="text-xl font-bold tracking-tight px-2">{monthTitle} Reports</h1>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              const now = new Date();
              const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              navigateMonth(cur);
            }}
          >
            Current Month
          </Button>
        </div>

        {/* Export CSV Button */}
        <a href={`/reports/export?month=${currentMonth}`} download>
          <Button variant="default" size="sm" className="gap-1.5 h-9">
            <DownloadIcon className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </a>
      </div>

      {/* Monthly P&L Statement */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheetIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Monthly Profit &amp; Loss Statement</CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {currentMonth}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Revenue from completed and active bookings in IST event month (plus cancelled booking net received in cancellation month), linked event direct costs, and unlinked operational overheads.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left pb-2 font-semibold">Financial Line Item</th>
                  <th className="text-right pb-2 font-semibold">{monthTitle}</th>
                  <th className="text-right pb-2 font-semibold">{prevMonthTitle}</th>
                  <th className="text-right pb-2 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {/* Revenue */}
                <tr className="font-bold bg-muted/20">
                  <td className="py-2.5">
                    Gross Revenue
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {current.bookingCount} active events + {current.cancelledCount} cancelled slot
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-sm text-primary">
                    {inr(current.revenue)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted-foreground">
                    {inr(previous.revenue)}
                  </td>
                  <td className="py-2.5 text-right">{renderDiff(comparison.revenueDiff)}</td>
                </tr>

                {/* Direct Costs */}
                <tr>
                  <td className="py-2 text-muted-foreground pl-3">
                    Less: Direct Event Costs
                    <span className="block text-[10px] text-muted-foreground">
                      Operator fees, transport, food, venue cut, consumables
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground">
                    -{inr(current.directCosts)}
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground">
                    -{inr(previous.directCosts)}
                  </td>
                  <td className="py-2 text-right">{renderDiff(comparison.directCostsDiff, true)}</td>
                </tr>

                {/* Gross Profit */}
                <tr className="font-semibold bg-muted/10">
                  <td className="py-2">
                    Gross Profit
                    {current.grossMargin !== null && (
                      <span className="ml-2 font-mono text-[11px] text-primary">
                        ({current.grossMargin}% margin)
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono text-sm">
                    {inr(current.grossProfit)}
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground">
                    {inr(previous.grossProfit)}
                  </td>
                  <td className="py-2 text-right">{renderDiff(comparison.grossProfitDiff)}</td>
                </tr>

                {/* Overheads Section */}
                <tr className="text-muted-foreground italic">
                  <td colSpan={4} className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Operating Overheads (Unlinked)
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pl-3">Setup, Equipment, Software &amp; EMI</td>
                  <td className="py-1.5 text-right font-mono">-{inr(current.overheads.setup)}</td>
                  <td className="py-1.5 text-right font-mono text-muted-foreground">-{inr(previous.overheads.setup)}</td>
                  <td className="py-1.5 text-right">—</td>
                </tr>
                <tr>
                  <td className="py-1.5 pl-3">Marketing &amp; Advertising</td>
                  <td className="py-1.5 text-right font-mono">-{inr(current.overheads.marketing)}</td>
                  <td className="py-1.5 text-right font-mono text-muted-foreground">-{inr(previous.overheads.marketing)}</td>
                  <td className="py-1.5 text-right">—</td>
                </tr>
                <tr>
                  <td className="py-1.5 pl-3">General, Admin &amp; Misc</td>
                  <td className="py-1.5 text-right font-mono">-{inr(current.overheads.general)}</td>
                  <td className="py-1.5 text-right font-mono text-muted-foreground">-{inr(previous.overheads.general)}</td>
                  <td className="py-1.5 text-right">—</td>
                </tr>
                <tr className="font-medium text-muted-foreground">
                  <td className="py-2">Total Overheads</td>
                  <td className="py-2 text-right font-mono">-{inr(current.overheads.total)}</td>
                  <td className="py-2 text-right font-mono">-{inr(previous.overheads.total)}</td>
                  <td className="py-2 text-right">{renderDiff(comparison.overheadsDiff, true)}</td>
                </tr>

                {/* Net Profit */}
                <tr className="font-bold text-sm bg-primary/5 border-t-2">
                  <td className="py-3">
                    Net Profit
                    {current.netMargin !== null && (
                      <span className="ml-2 font-mono text-xs text-primary">
                        ({current.netMargin}% net margin)
                      </span>
                    )}
                  </td>
                  <td className={`py-3 text-right font-mono text-base ${current.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                    {inr(current.netProfit)}
                  </td>
                  <td className="py-3 text-right font-mono text-muted-foreground">
                    {inr(previous.netProfit)}
                  </td>
                  <td className="py-3 text-right">{renderDiff(comparison.netProfitDiff)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Two Columns: Conversion by Source and City Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Conversion by Source */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Conversion by Source</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Closed lead conversion rate = won / (won + lost). Open leads are tracked beside.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {conversionData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No lead data found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2">Source</th>
                      <th className="text-right pb-2">Total</th>
                      <th className="text-right pb-2 text-emerald-700 dark:text-emerald-400">Won</th>
                      <th className="text-right pb-2 text-stone-500">Lost</th>
                      <th className="text-right pb-2 text-muted-foreground">Open</th>
                      <th className="text-right pb-2 font-bold text-primary">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {conversionData.map((row) => (
                      <tr key={row.source} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 font-medium">{row.source.replaceAll("_", " ")}</td>
                        <td className="py-2 text-right font-mono">{row.totalLeads}</td>
                        <td className="py-2 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {row.won}
                        </td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{row.lost}</td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{row.open}</td>
                        <td className="py-2 text-right font-mono font-bold text-primary">
                          {row.conversion !== null ? `${row.conversion}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* City Summary: Patna vs Delhi vs Others */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BuildingIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Patna vs. Delhi NCR Performance</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Active booking volume, average deal size, and gross margin by region.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cityData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No city data recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2">City</th>
                      <th className="text-right pb-2">Events</th>
                      <th className="text-right pb-2">Billed</th>
                      <th className="text-right pb-2">Avg Deal Size</th>
                      <th className="text-right pb-2 font-bold text-primary">Gross Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cityData.map((row) => (
                      <tr key={row.city} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 font-semibold">{row.city}</td>
                        <td className="py-2.5 text-right font-mono">{row.events}</td>
                        <td className="py-2.5 text-right font-mono font-medium">{inr(row.billed)}</td>
                        <td className="py-2.5 text-right font-mono">{inr(row.avgDealSize)}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-primary">
                          {row.grossMargin !== null ? `${row.grossMargin}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
