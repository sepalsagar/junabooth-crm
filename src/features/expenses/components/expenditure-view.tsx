"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatDateIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { EXPENSE_GROUPS, type ExpenseGroup } from "../groups";
import type { ExpenseCategory } from "@/generated/prisma/client";
import type { getExpenses } from "../queries";

type ExpenseData = Awaited<ReturnType<typeof getExpenses>>;

export function ExpenditureView({
  group,
  data,
  totals,
  monthlySpend,
  searchParams,
  signedReceipts,
}: {
  group: ExpenseGroup;
  data: ExpenseData;
  totals: { categoryTotals: Partial<Record<ExpenseCategory, number>> };
  monthlySpend: number;
  searchParams: Record<string, string | string[] | undefined>;
  signedReceipts: Record<string, string>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(String(searchParams.search ?? ""));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (typeof value === "string" && key !== "search") params.set(key, value);
      });
      if (search) params.set("search", search); else params.delete("search");
      router.replace(`/expenditure${group === "all" ? "" : `/${group}`}?${params.toString()}`);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, group, router, searchParams]);

  const chips = (
    <div className="flex flex-wrap gap-2">
      {EXPENSE_GROUPS.map((item) => (
        <Link key={item} href={`/expenditure${item === "all" ? "" : `/${item}`}`}>
          <Button size="sm" variant={item === group ? "default" : "outline"}>{item === "all" ? "All" : item.replace("-", " ")}</Button>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="hidden md:block">{chips}</div>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Filters</SheetTrigger>
          <SheetContent side="left"><SheetTitle>Expenditure filters</SheetTitle><div className="p-4 space-y-4">{chips}</div></SheetContent>
        </Sheet>
      </div>
      <div className="flex gap-3 overflow-x-auto">
        <Card className="min-w-40"><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">This month</CardTitle></CardHeader><CardContent className="font-semibold">{inr(monthlySpend)}</CardContent></Card>
        {Object.entries(totals.categoryTotals).map(([category, amount]) => (
          <Card key={category} className="min-w-40"><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{category.replaceAll("_", " ")}</CardTitle></CardHeader><CardContent className="font-semibold">{inr(amount ?? 0)}</CardContent></Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search note" className="max-w-sm" />
        <Button variant="outline" onClick={() => { setSearch(""); router.replace(`/expenditure${group === "all" ? "" : `/${group}`}`); }}>Clear all</Button>
      </div>
      <div className="hidden overflow-hidden rounded-md border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="p-3">Date</th><th>Category</th><th>Paid by</th><th>Note</th><th>Amount</th><th>Receipt</th></tr></thead>
          <tbody>{data.rows.map((row) => (
            <tr key={row.id} className={row.voidedAt ? "opacity-50" : ""}>
              <td className="p-3">{formatDateIST(row.spentOn)}</td>
              <td>{row.category.replaceAll("_", " ")}</td>
              <td>{row.paidBy || "—"}</td>
              <td>{row.note || "—"}{row.voidedAt && <Badge variant="destructive" className="ml-2">Voided</Badge>}</td>
              <td className="font-semibold">{inr(row.amount)}</td>
              <td>{row.receiptPath && signedReceipts[row.id] ? <a href={signedReceipts[row.id]} target="_blank" rel="noreferrer"><Image src={signedReceipts[row.id]} alt="Receipt" width={40} height={40} unoptimized className="h-10 w-10 rounded object-cover" /></a> : <Badge variant="outline">Missing receipt</Badge>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">{data.rows.map((row) => (
        <Card key={row.id}><CardContent className="p-4"><div className="flex justify-between"><div><p className="font-semibold">{row.category.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{formatDateIST(row.spentOn)} · {row.paidBy || "—"}</p></div><p className="font-semibold">{inr(row.amount)}</p></div><p className="mt-2 text-sm">{row.note || "—"}</p><div className="mt-2">{row.receiptPath ? <Badge>Receipt</Badge> : <Badge variant="outline">Missing receipt</Badge>}{row.voidedAt && <Badge variant="destructive" className="ml-2">Voided</Badge>}</div></CardContent></Card>
      ))}</div>
      {data.rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No expenses found.</p>}
      {data.totalPages > 1 && <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages}</span><div className="flex gap-2"><Button variant="outline" disabled={data.page <= 1} onClick={() => router.push(`/expenditure${group === "all" ? "" : `/${group}`}?page=${data.page - 1}`)}>Previous</Button><Button variant="outline" disabled={data.page >= data.totalPages} onClick={() => router.push(`/expenditure${group === "all" ? "" : `/${group}`}?page=${data.page + 1}`)}>Next</Button></div></div>}
    </div>
  );
}
