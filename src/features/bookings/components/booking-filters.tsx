"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import {
  FilterIcon,
  SearchIcon,
  XIcon,
  SlidersHorizontalIcon,
  ArrowUpDownIcon,
  CalendarIcon,
  MapPinIcon,
  CircleDollarSignIcon,
  CheckCircle2Icon,
} from "lucide-react";
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  PAYMENT_STATUS_FILTERS,
  type BookingStatusType,
  type BookingTypeKind,
  type PaymentStatusFilterType,
} from "../schema";

// Status display labels
const STATUS_LABELS: Record<string, string> = {
  OPTION: "Option",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  POSTPONED: "Postponed",
};

const TIMEFRAME_OPTIONS = [
  { value: "", label: "All dates" },
  { value: "upcoming", label: "⬆ Upcoming" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "next-month", label: "Next month" },
  { value: "past", label: "Past events" },
];

const SORT_OPTIONS = [
  { value: "eventDate_asc", label: "Event date (earliest)" },
  { value: "eventDate_desc", label: "Event date (latest)" },
  { value: "newest", label: "Recently added" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc", label: "Lowest amount" },
];

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
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror URL search param into local state
  const urlQ = searchParams.get("q") ?? "";
  const [searchVal, setSearchVal] = useState(urlQ);
  const prevUrlQRef = useRef(urlQ);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync search input if URL changes externally (e.g. browser back)
  if (urlQ !== prevUrlQRef.current) {
    prevUrlQRef.current = urlQ;
    setSearchVal(urlQ);
  }

  // ─── Core: instant param update ──────────────────────────────────────────
  const updateFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in updates)) params.delete("page");
      // startTransition gives React a chance to dim the table immediately
      startTransition(() =>
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      );
    },
    [pathname, router, searchParams]
  );

  // Debounced search — 300ms so it only fires after user pauses typing
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (searchVal.trim() !== current) {
        updateFilters({ q: searchVal.trim() || null });
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchVal, searchParams, updateFilters]);

  // ─── Read current filters from URL ───────────────────────────────────────
  const statuses = (searchParams.get("status") ?? "")
    .split(",")
    .filter(Boolean) as BookingStatusType[];
  const types = (searchParams.get("type") ?? "")
    .split(",")
    .filter(Boolean) as BookingTypeKind[];
  const paymentStatuses = (searchParams.get("paymentStatus") ?? "")
    .split(",")
    .filter(Boolean) as PaymentStatusFilterType[];
  const city = searchParams.get("city") ?? "";
  const timeframe = searchParams.get("timeframe") ?? "";
  const balanceDue = searchParams.get("balanceDue") ?? "";
  const sort = searchParams.get("sort") ?? "eventDate_asc";

  const activeCount =
    (statuses.length ? 1 : 0) +
    (types.length ? 1 : 0) +
    (paymentStatuses.length ? 1 : 0) +
    (city ? 1 : 0) +
    (timeframe ? 1 : 0) +
    (balanceDue ? 1 : 0) +
    (searchVal ? 1 : 0);

  const clearAll = () => {
    setSearchVal("");
    startTransition(() => router.push(pathname));
  };

  const toggleStatus = (status: BookingStatusType) => {
    const next = statuses.includes(status)
      ? statuses.filter((s) => s !== status)
      : [...statuses, status];
    updateFilters({ status: next.length ? next.join(",") : null });
  };

  // ─── Filter panel (shared desktop + mobile) ───────────────────────────────
  const filterPanel = (
    <div className="space-y-4">
      {/* Status pills */}
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <CheckCircle2Icon className="size-3.5" />
          Status
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BOOKING_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statuses.includes(status)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              {STATUS_LABELS[status] ?? status}
            </button>
          ))}
        </div>
      </div>

      {/* Quick filters grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Date / Timeframe */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CalendarIcon className="size-3" />
            Date range
          </label>
          <select
            value={timeframe}
            onChange={(e) => updateFilters({ timeframe: e.target.value || null })}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs cursor-pointer"
          >
            {TIMEFRAME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MapPinIcon className="size-3" />
            Region
          </label>
          <select
            value={city}
            onChange={(e) => updateFilters({ city: e.target.value || null })}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs cursor-pointer"
          >
            <option value="">All regions</option>
            {facets.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Payment status */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CircleDollarSignIcon className="size-3" />
            Payment
          </label>
          <select
            value={paymentStatuses[0] ?? ""}
            onChange={(e) =>
              updateFilters({ paymentStatus: e.target.value || null })
            }
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs cursor-pointer"
          >
            <option value="">All states</option>
            {PAYMENT_STATUS_FILTERS.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Balance */}
        <div>
          <label className="mb-1 text-xs font-medium text-muted-foreground block">
            Balance
          </label>
          <select
            value={balanceDue}
            onChange={(e) => updateFilters({ balanceDue: e.target.value || null })}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs cursor-pointer"
          >
            <option value="">All</option>
            <option value="has_balance">Has balance due</option>
            <option value="no_balance">Fully settled</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ArrowUpDownIcon className="size-3" />
            Sort by
          </label>
          <select
            value={sort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Type toggle (small) */}
      {BOOKING_TYPES.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Booking type
          </label>
          <div className="flex gap-1.5">
            {BOOKING_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateFilters({ type: types[0] === t ? null : t })}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  types[0] === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2.5">
      {/* Search + Mobile Filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search client, ID, venue, phone…"
            className="bg-card pl-8 pr-8 text-xs h-9"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => {
                setSearchVal("");
                updateFilters({ q: null });
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile sheet trigger */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="outline" className="gap-2 shrink-0" />}>
              <SlidersHorizontalIcon className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeCount}
                </Badge>
              )}
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Filter bookings</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                {filterPanel}
                <Button
                  className="w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Show results ({totalCount})
                </Button>
                <Button variant="outline" className="w-full" onClick={clearAll}>
                  Clear all filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop filter panel — always visible */}
      <div
        className={`hidden md:block rounded-lg border bg-card p-3 transition-opacity duration-150 ${
          isPending ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        {filterPanel}
      </div>

      {/* Active filter badges + pending indicator */}
      {(activeCount > 0 || isPending) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs min-h-[24px]">
          {isPending && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground italic animate-pulse">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              Updating…
            </span>
          )}
          {!isPending && searchVal && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setSearchVal(""); updateFilters({ q: null }); }}>
              Search: {searchVal} <XIcon className="size-3" />
            </Badge>
          )}
          {!isPending && statuses.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleStatus(s)}>
              {STATUS_LABELS[s] ?? s} <XIcon className="size-3" />
            </Badge>
          ))}
          {!isPending && city && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => updateFilters({ city: null })}>
              {city} <XIcon className="size-3" />
            </Badge>
          )}
          {!isPending && timeframe && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => updateFilters({ timeframe: null })}>
              {TIMEFRAME_OPTIONS.find((o) => o.value === timeframe)?.label ?? timeframe}{" "}
              <XIcon className="size-3" />
            </Badge>
          )}
          {!isPending && paymentStatuses.map((p) => (
            <Badge key={p} variant="secondary" className="gap-1 cursor-pointer" onClick={() => updateFilters({ paymentStatus: null })}>
              {p.replace(/_/g, " ")} <XIcon className="size-3" />
            </Badge>
          ))}
          {!isPending && balanceDue && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => updateFilters({ balanceDue: null })}>
              {balanceDue === "has_balance" ? "Has balance" : "Fully settled"}{" "}
              <XIcon className="size-3" />
            </Badge>
          )}
          {!isPending && activeCount > 0 && (
            <Button variant="ghost" size="xs" onClick={clearAll} className="text-xs h-5 px-2">
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
