"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterIcon, SearchIcon, XIcon } from "lucide-react";
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  PAYMENT_STATUS_FILTERS,
  type BookingStatusType,
  type BookingTypeKind,
  type PaymentStatusFilterType,
} from "../schema";

export function BookingFilters({
  facets,
  totalCount,
}: {
  facets: { cities: string[]; packages: { id: string; name: string }[] };
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlQ = searchParams.get("q") ?? "";
  const [searchVal, setSearchVal] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setSearchVal(urlQ);
  }

  const updateFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in updates)) params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchVal !== (searchParams.get("q") ?? "")) {
        updateFilters({ q: searchVal.trim() || null });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal, searchParams, updateFilters]);

  const statuses = (searchParams.get("status") ?? "").split(",").filter(Boolean) as BookingStatusType[];
  const types = (searchParams.get("type") ?? "").split(",").filter(Boolean) as BookingTypeKind[];
  const paymentStatuses = (searchParams.get("paymentStatus") ?? "").split(",").filter(Boolean) as PaymentStatusFilterType[];
  const city = searchParams.get("city") ?? "";
  const timeframe = searchParams.get("timeframe") ?? "";
  const balanceDue = searchParams.get("balanceDue") ?? "";
  const belowRate = searchParams.get("belowRate") === "true";
  const sort = searchParams.get("sort") ?? "eventDate_asc";
  const activeCount =
    (statuses.length ? 1 : 0) +
    (types.length ? 1 : 0) +
    (paymentStatuses.length ? 1 : 0) +
    (city ? 1 : 0) +
    (timeframe ? 1 : 0) +
    (balanceDue ? 1 : 0) +
    (belowRate ? 1 : 0) +
    (searchVal ? 1 : 0);

  const clearAll = () => {
    setSearchVal("");
    startTransition(() => router.push(pathname));
  };

  const toggleStatus = (status: BookingStatusType) => {
    const next = statuses.includes(status) ? statuses.filter((item) => item !== status) : [...statuses, status];
    updateFilters({ status: next.length ? next.join(",") : null });
  };

  const controls = (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
        <div className="flex flex-wrap gap-1">
          {BOOKING_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                statuses.includes(status)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              {status.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
          <select value={city} onChange={(event) => updateFilters({ city: event.target.value || null })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All cities</option>
            {facets.cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
          <select value={types[0] ?? ""} onChange={(event) => updateFilters({ type: event.target.value || null })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All types</option>
            {BOOKING_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Payment</label>
          <select value={paymentStatuses[0] ?? ""} onChange={(event) => updateFilters({ paymentStatus: event.target.value || null })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All payment states</option>
            {PAYMENT_STATUS_FILTERS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Balance</label>
          <select value={balanceDue} onChange={(event) => updateFilters({ balanceDue: event.target.value || null })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All</option>
            <option value="has_balance">Has balance</option>
            <option value="no_balance">No balance</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
          <select value={timeframe} onChange={(event) => updateFilters({ timeframe: event.target.value || null })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All dates</option>
            <option value="this-week">This week</option>
            <option value="this-month">This month</option>
            <option value="past">Past</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort</label>
          <select value={sort} onChange={(event) => updateFilters({ sort: event.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
            <option value="eventDate_asc">Event soonest</option>
            <option value="eventDate_desc">Event latest</option>
            <option value="newest">Newest</option>
            <option value="amount_desc">Amount high</option>
            <option value="amount_asc">Amount low</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={belowRate} onChange={(event) => updateFilters({ belowRate: event.target.checked ? "true" : null })} />
        Base price below package rate
      </label>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={searchVal} onChange={(event) => setSearchVal(event.target.value)} placeholder="Search client, phone or booking code" className="bg-card pl-8" />
          {searchVal && <button type="button" onClick={() => { setSearchVal(""); updateFilters({ q: null }); }} className="absolute right-2.5 top-2.5"><XIcon className="h-4 w-4" /></button>}
        </div>
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="outline" className="w-full gap-2" />}>
              <FilterIcon className="h-4 w-4" /> Filters
              {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-md">
              <SheetHeader><SheetTitle>Filter bookings</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">{controls}<Button className="w-full" onClick={() => setMobileOpen(false)}>Show results ({totalCount})</Button><Button variant="outline" className="w-full" onClick={clearAll}>Clear all</Button></div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="hidden rounded-lg border bg-card p-3 md:block">{controls}</div>
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {searchVal && <Badge variant="secondary">Search: {searchVal}</Badge>}
          {statuses.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
          {city && <Badge variant="secondary">City: {city}</Badge>}
          {paymentStatuses.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
          <Button variant="ghost" size="xs" onClick={clearAll}>Clear all</Button>
          {isPending && <span className="ml-auto italic text-muted-foreground">Updating...</span>}
        </div>
      )}
    </div>
  );
}
