"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/format";
import { AddCapitalSheet } from "./add-capital-sheet";
import { CapitalEntriesList } from "./capital-entries-list";
import type { PartnersCapitalData } from "../queries";
import { WalletIcon, UserIcon, ArrowDownLeftIcon, ArrowUpRightIcon, MinusIcon, PlusIcon } from "lucide-react";

interface PartnersViewProps {
  data: PartnersCapitalData;
}

export function PartnersView({ data }: PartnersViewProps) {
  const { partners, cashPosition, entries, totalNet } = data;
  const activePartners = partners.filter((partner) => !partner.disabled);

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partners and Capital</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Partner equity, profit/loss share percentages, and live cash position
          </p>
        </div>

        <AddCapitalSheet partners={activePartners.map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      {/* Cash Position Card with 4-line breakdown */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WalletIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Cash Position</CardTitle>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Cash in hand</span>
              <span className={`text-2xl font-bold font-mono ${cashPosition.total >= 0 ? "text-primary" : "text-destructive"}`}>
                {inr(cashPosition.total)}
              </span>
            </div>
          </div>
          <CardDescription className="text-xs mt-1">
            Reconciled live cash balance across all equity injections, booking collections, operational expenses, and partner withdrawals.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Line 1: Injected */}
            <div className="rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <PlusIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Capital Injected
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">+</span>
              </div>
              <div className="text-lg font-bold font-mono mt-1 text-emerald-700 dark:text-emerald-400">
                {inr(cashPosition.injected)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">All equity contributions</p>
            </div>

            {/* Line 2: Received */}
            <div className="rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <ArrowDownLeftIcon className="h-3.5 w-3.5 text-blue-600" />
                  Payments Received
                </span>
                <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">+</span>
              </div>
              <div className="text-lg font-bold font-mono mt-1 text-blue-700 dark:text-blue-400">
                {inr(cashPosition.received)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Net booking payments</p>
            </div>

            {/* Line 3: Expenses */}
            <div className="rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-amber-600" />
                  Expenses Paid
                </span>
                <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">-</span>
              </div>
              <div className="text-lg font-bold font-mono mt-1 text-amber-700 dark:text-amber-400">
                {inr(cashPosition.expenses)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">All live expenditures</p>
            </div>

            {/* Line 4: Withdrawn */}
            <div className="rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <MinusIcon className="h-3.5 w-3.5 text-red-600" />
                  Capital Withdrawn
                </span>
                <span className="font-mono text-red-700 dark:text-red-400 font-bold">-</span>
              </div>
              <div className="text-lg font-bold font-mono mt-1 text-red-700 dark:text-red-400">
                {inr(cashPosition.withdrawn)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Partner payouts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner Equity Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Partner Equity &amp; Shares</h2>
            <p className="text-xs text-muted-foreground">
              Total net capital: <strong className="text-foreground">{inr(totalNet)}</strong>
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activePartners.map((p) => (
            <Card key={p.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span>{p.name}</span>
                  </CardTitle>
                  <span className="text-xs font-bold font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {p.share !== null ? `${p.share}%` : "—"}
                  </span>
                </div>
                <CardDescription className="text-xs truncate">{p.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Injected:</span>
                  <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
                    {inr(p.injected)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Withdrawn:</span>
                  <span className="font-mono font-medium text-amber-700 dark:text-amber-400">
                    {inr(p.withdrawn)}
                  </span>
                </div>
                <div className="flex justify-between pt-0.5 font-bold">
                  <span>Net capital:</span>
                  <span className="font-mono text-primary">{inr(p.net)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Capital Entries List */}
      <CapitalEntriesList entries={entries} />
    </div>
  );
}
