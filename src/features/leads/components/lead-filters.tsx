"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  FOLLOW_UP_FILTERS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type FollowUpFilterType,
  type LeadSourceType,
  type LeadStatusType,
} from "../schema";
import { FilterIcon, SearchIcon, XIcon } from "lucide-react";

interface LeadFiltersProps {
  facets: {
    cities: string[];
    eventTypes: string[];
    users: { id: string; name: string; role: string }[];
  };
  totalCount: number;
}

export function LeadFilters({ facets, totalCount }: LeadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search input state for debouncing
  const urlQ = searchParams.get("q") ?? "";
  const [searchVal, setSearchVal] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Sync internal search input during render when URL changes externally
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setSearchVal(urlQ);
  }

  // Push new query params
  const updateFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      // Reset to page 1 whenever any filter changes
      if (!("page" in updates)) {
        params.delete("page");
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  // Debounced search effect (100ms for fast responsive search)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchVal !== (searchParams.get("q") ?? "")) {
        updateFilters({ q: searchVal.trim() ? searchVal.trim() : null });
      }
    }, 100);

    return () => clearTimeout(handler);
  }, [searchVal, searchParams, updateFilters]);

  // Current filter values from URL
  const selectedStatuses = (searchParams.get("status") ?? "")
    .split(",")
    .filter(Boolean) as LeadStatusType[];
  const selectedCity = searchParams.get("city") ?? "";
  const selectedSource = (searchParams.get("source") ?? "")
    .split(",")
    .filter(Boolean) as LeadSourceType[];
  const selectedEventType = searchParams.get("eventType") ?? "";
  const selectedOwner = searchParams.get("owner") ?? "";
  const selectedFollowUp = searchParams.get("followUp") as FollowUpFilterType | null;
  const selectedSort = searchParams.get("sort") ?? "newest";

  // Compute count of active filters
  const activeFiltersCount =
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedSource.length > 0 ? 1 : 0) +
    (selectedEventType ? 1 : 0) +
    (selectedOwner ? 1 : 0) +
    (selectedFollowUp ? 1 : 0) +
    (searchVal ? 1 : 0);

  const clearAllFilters = () => {
    setSearchVal("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const toggleStatus = (status: LeadStatusType) => {
    let next: string[];
    if (selectedStatuses.includes(status)) {
      next = selectedStatuses.filter((s) => s !== status);
    } else {
      next = [...selectedStatuses, status];
    }
    updateFilters({ status: next.length > 0 ? next.join(",") : null });
  };

  const removeSingleFilter = (key: string) => {
    if (key === "q") setSearchVal("");
    updateFilters({ [key]: null });
  };

  return (
    <div className="space-y-3">
      {/* Search and Mobile Filter Trigger Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search client, phone, lead ID (ENQ-...)..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="pl-8 bg-card text-xs h-9"
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

        {/* Mobile Filter Sheet Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger render={<Button variant="outline" className="w-full gap-2" />}>
              <FilterIcon className="h-4 w-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-md p-6">
              <SheetHeader>
                <SheetTitle>Filter Leads</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <FilterControls
                  facets={facets}
                  selectedStatuses={selectedStatuses}
                  selectedCity={selectedCity}
                  selectedSource={selectedSource}
                  selectedEventType={selectedEventType}
                  selectedOwner={selectedOwner}
                  selectedFollowUp={selectedFollowUp}
                  selectedSort={selectedSort}
                  toggleStatus={toggleStatus}
                  updateFilters={updateFilters}
                />
                <Button
                  className="w-full mt-4"
                  onClick={() => setMobileSheetOpen(false)}
                >
                  Show Results ({totalCount})
                </Button>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      clearAllFilters();
                      setMobileSheetOpen(false);
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Filter Bar */}
      <div className="hidden md:block rounded-lg border bg-card p-3 shadow-xs">
        <FilterControls
          facets={facets}
          selectedStatuses={selectedStatuses}
          selectedCity={selectedCity}
          selectedSource={selectedSource}
          selectedEventType={selectedEventType}
          selectedOwner={selectedOwner}
          selectedFollowUp={selectedFollowUp}
          selectedSort={selectedSort}
          toggleStatus={toggleStatus}
          updateFilters={updateFilters}
        />
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-muted-foreground mr-1">Active filters:</span>
          {searchVal && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchVal}
              <button onClick={() => removeSingleFilter("q")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedStatuses.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Status: {selectedStatuses.join(", ")}
              <button onClick={() => removeSingleFilter("status")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedFollowUp && (
            <Badge variant="secondary" className="gap-1">
              Follow-up: {selectedFollowUp}
              <button onClick={() => removeSingleFilter("followUp")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCity && (
            <Badge variant="secondary" className="gap-1">
              City: {selectedCity}
              <button onClick={() => removeSingleFilter("city")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedSource.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Source: {selectedSource.join(", ")}
              <button onClick={() => removeSingleFilter("source")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedEventType && (
            <Badge variant="secondary" className="gap-1">
              Event: {selectedEventType}
              <button onClick={() => removeSingleFilter("eventType")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedOwner && (
            <Badge variant="secondary" className="gap-1">
              Owner: {selectedOwner === "me" ? "Assigned to me" : "Specific user"}
              <button onClick={() => removeSingleFilter("owner")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-6 px-1.5"
          >
            Clear all
          </Button>
          {isPending && (
            <span className="text-muted-foreground italic text-xs ml-auto">
              Updating...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function FilterControls({
  facets,
  selectedStatuses,
  selectedCity,
  selectedSource,
  selectedEventType,
  selectedOwner,
  selectedFollowUp,
  selectedSort,
  toggleStatus,
  updateFilters,
}: {
  facets: LeadFiltersProps["facets"];
  selectedStatuses: LeadStatusType[];
  selectedCity: string;
  selectedSource: LeadSourceType[];
  selectedEventType: string;
  selectedOwner: string;
  selectedFollowUp: FollowUpFilterType | null;
  selectedSort: string;
  toggleStatus: (s: LeadStatusType) => void;
  updateFilters: (u: Record<string, string | null | undefined>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Status multi-buttons */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Status
        </label>
        <div className="flex flex-wrap gap-1">
          {LEAD_STATUSES.map((status) => {
            const isSelected = selectedStatuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-input hover:bg-muted"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dropdown Filters Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-1">
        {/* Follow-up filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Follow-up
          </label>
          <select
            value={selectedFollowUp ?? ""}
            onChange={(e) => updateFilters({ followUp: e.target.value || null })}
            className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
          >
            <option value="">All Follow-ups</option>
            {FOLLOW_UP_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Region
          </label>
          <select
            value={selectedCity}
            onChange={(e) => updateFilters({ city: e.target.value || null })}
            className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
          >
            <option value="">All Regions</option>
            {facets.cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Event Type */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Event Type
          </label>
          <select
            value={selectedEventType}
            onChange={(e) => updateFilters({ eventType: e.target.value || null })}
            className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
          >
            <option value="">All Event Types</option>
            {facets.eventTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Source
          </label>
          <select
            value={selectedSource[0] ?? ""}
            onChange={(e) => updateFilters({ source: e.target.value || null })}
            className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Owner */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Owner
          </label>
          <select
            value={selectedOwner}
            onChange={(e) => updateFilters({ owner: e.target.value || null })}
            className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
          >
            <option value="">All Owners</option>
            <option value="me">Assigned to Me</option>
            {facets.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Sort by
          </label>
          <select
            value={selectedSort}
            onChange={(e) => updateFilters({ sort: e.target.value || "newest" })}
            className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="targetDate_asc">Target Date (soonest)</option>
            <option value="targetDate_desc">Target Date (latest)</option>
            <option value="followUp_asc">Follow-up (soonest)</option>
            <option value="amount_desc">Amount (high to low)</option>
            <option value="amount_asc">Amount (low to high)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
