"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { XIcon } from "lucide-react";
import type { OverviewRange } from "../filters";

interface OverviewFiltersBarProps {
  currentRange: OverviewRange;
  currentCity?: string;
  availableCities: string[];
}

export function OverviewFiltersBar({
  currentRange,
  currentCity,
  availableCities,
}: OverviewFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "this-month") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/overview?${params.toString()}`);
  };

  const clearAll = () => {
    router.push("/overview");
  };

  const hasActiveFilters = currentRange !== "this-month" || Boolean(currentCity);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Range Selector */}
        <div className="w-40">
          <Select
            value={currentRange}
            onValueChange={(val) => updateParam("range", val as OverviewRange)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="last-month">Last month</SelectItem>
              <SelectItem value="season">This season</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* City Selector */}
        <div className="w-40">
          <Select
            value={currentCity || "all"}
            onValueChange={(val) => updateParam("city", val === "all" || !val ? undefined : val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground">Active:</span>
          {currentRange !== "this-month" && (
            <Badge variant="secondary" className="gap-1 py-0.5">
              <span>Range: {currentRange}</span>
              <button
                type="button"
                onClick={() => updateParam("range", "this-month")}
                className="hover:text-destructive"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {currentCity && (
            <Badge variant="secondary" className="gap-1 py-0.5">
              <span>City: {currentCity}</span>
              <button
                type="button"
                onClick={() => updateParam("city", undefined)}
                className="hover:text-destructive"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
