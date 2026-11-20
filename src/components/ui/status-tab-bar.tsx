"use client";

/**
 * Quick-switch status tab bar.
 * Renders horizontal pills for each status (+ "All").
 * Clicking a tab sets ?status=X on the current URL, resetting page to 1.
 * Works for both Bookings and Leads pages.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface StatusTab {
  value: string;    // URL value (e.g. "CONFIRMED")
  label: string;    // Display label
  count?: number;
}

interface StatusTabBarProps {
  tabs: StatusTab[];
  paramKey?: string; // defaults to "status"
}

const BASE =
  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap";
const ACTIVE = "bg-primary text-primary-foreground shadow-sm";
const IDLE = "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground";

export function StatusTabBar({ tabs, paramKey = "status" }: StatusTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentVal = searchParams.get(paramKey) ?? "";

  const go = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramKey, value);
    else params.delete(paramKey);
    params.delete("page"); // reset pagination
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <button
        type="button"
        onClick={() => go("")}
        className={`${BASE} ${currentVal === "" ? ACTIVE : IDLE}`}
      >
        All
      </button>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => go(tab.value)}
          className={`${BASE} ${currentVal === tab.value ? ACTIVE : IDLE}`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 opacity-70">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
