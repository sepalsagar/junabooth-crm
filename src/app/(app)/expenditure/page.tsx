import { requireRole } from "@/lib/auth-guards";
import { parseExpenseFilters } from "@/features/expenses/filters";
import { getExpenses, getExpenseTotals, getMonthlySpend, getExpenseFormOptions } from "@/features/expenses/queries";
import { getReceiptUrl } from "@/features/expenses/storage";
import { ExpenditureView } from "@/features/expenses/components/expenditure-view";
import { AddExpenseSheet } from "@/features/expenses/components/add-expense-sheet";

export default async function ExpenditurePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(["PARTNER"]);
  const raw = await searchParams;
  const normalized = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const filters = parseExpenseFilters({ ...normalized, group: "all" });
  const [data, totals, monthlySpend, options] = await Promise.all([
    getExpenses(filters),
    getExpenseTotals(filters),
    getMonthlySpend(),
    getExpenseFormOptions(),
  ]);
  const signedEntries = await Promise.all(data.rows.filter((row) => row.receiptPath).map(async (row) => [row.id, await getReceiptUrl(row.receiptPath!)] as const));
  const signedReceipts = Object.fromEntries(signedEntries.filter(([, url]) => url).map(([id, url]) => [id, url!]));
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Expenditure</h1><p className="text-sm text-muted-foreground">Partner-only event costs and receipts.</p></div>
        <AddExpenseSheet bookings={options.bookings} paidBy={options.paidBy} />
      </div>
      <ExpenditureView group="all" data={data} totals={totals} monthlySpend={monthlySpend} searchParams={normalized} signedReceipts={signedReceipts} />
    </div>
  );
}
