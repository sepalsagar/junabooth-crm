"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateIST, toISODateStringIST } from "@/lib/dates";
import { telLink, whatsappLink } from "@/features/leads/phone";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { buildMonthGrid } from "../grid";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
  PhoneIcon,
} from "lucide-react";
import type { BookingStatus, BoothUnit } from "@/generated/prisma/client";

export interface CalendarBookingItem {
  id: string;
  code: string;
  clientName: string;
  phone: string;
  city?: string | null;
  venue?: string | null;
  eventDate: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  status: BookingStatus;
  unit?: BoothUnit | null;
  hasClash: boolean;
  noUnit: boolean;
  clashingWith: string[];
}

interface CalendarViewProps {
  currentMonth: string; // YYYY-MM
  selectedCity?: string;
  cities: string[];
  bookings: CalendarBookingItem[];
}

function getAdjacentMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  const newY = date.getUTCFullYear();
  const newM = date.getUTCMonth() + 1;
  return `${newY}-${String(newM).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({
  currentMonth,
  selectedCity,
  cities,
  bookings,
}: CalendarViewProps) {
  const router = useRouter();
  const [yearNum, monthNum] = currentMonth.split("-").map(Number);
  const monthTitle = `${MONTH_NAMES[monthNum - 1]} ${yearNum}`;

  const prevMonth = getAdjacentMonth(currentMonth, -1);
  const nextMonth = getAdjacentMonth(currentMonth, 1);

  const gridCells = buildMonthGrid(yearNum, monthNum, 1);

  // Group bookings by IST date string YYYY-MM-DD
  const bookingsByDate = new Map<string, CalendarBookingItem[]>();
  for (const b of bookings) {
    const iso = toISODateStringIST(new Date(b.eventDate));
    if (!bookingsByDate.has(iso)) {
      bookingsByDate.set(iso, []);
    }
    bookingsByDate.get(iso)!.push(b);
  }

  const navigateMonth = (month: string) => {
    const params = new URLSearchParams();
    params.set("month", month);
    if (selectedCity) params.set("city", selectedCity);
    router.push(`/calendar?${params.toString()}`);
  };

  const navigateCity = (city?: string) => {
    const params = new URLSearchParams();
    params.set("month", currentMonth);
    if (city && city !== "all") params.set("city", city);
    router.push(`/calendar?${params.toString()}`);
  };

  // Agenda items: sorted distinct dates that have bookings
  const agendaDates = Array.from(bookingsByDate.keys()).sort();

  return (
    <div className="space-y-4">
      {/* Top Bar: Month Selector, Prev/Next, City Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth(prevMonth)}
              title="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateMonth(nextMonth)}
              title="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-xl font-bold tracking-tight px-2">{monthTitle}</h2>

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
            Today
          </Button>
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-3">
          <div className="w-44">
            <Select
              value={selectedCity || "all"}
              onValueChange={(val) => navigateCity(val === "all" || !val ? undefined : val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* DESKTOP: 42-Cell Month Grid (hidden on mobile, visible on md+) */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground py-2 bg-muted/30">
          {WEEKDAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* 6 rows of 7 days */}
        <div className="grid grid-cols-7 divide-x divide-y border-b">
          {gridCells.map((cell) => {
            const dayBookings = bookingsByDate.get(cell.iso) || [];

            return (
              <div
                key={cell.iso}
                className={`min-h-[110px] p-1.5 transition-colors flex flex-col justify-between ${
                  cell.inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground/60"
                }`}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between pb-1">
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      cell.inMonth ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-[10px] font-bold text-primary">
                      {dayBookings.length} {dayBookings.length === 1 ? "slot" : "slots"}
                    </span>
                  )}
                </div>

                {/* Day Events */}
                <div className="space-y-1 overflow-y-auto max-h-[85px]">
                  {dayBookings.map((b) => (
                    <Link
                      key={b.id}
                      href={`/bookings/${b.code}`}
                      className="block rounded border bg-background/80 hover:bg-muted p-1 text-[11px] leading-tight transition-colors group shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-primary truncate group-hover:underline">
                          {b.code}
                        </span>
                        <BookingStatusBadge status={b.status} />
                      </div>

                      <div className="font-medium text-foreground truncate mt-0.5">
                        {b.clientName}
                      </div>

                      <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        {b.startTime && <span>{b.startTime}</span>}
                        {b.city && <span>• {b.city}</span>}
                      </div>

                      {/* Warnings: Clash or No Unit */}
                      {b.hasClash ? (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-1 py-0.5 rounded">
                          <AlertCircleIcon className="h-3 w-3 shrink-0" />
                          <span>Clash ({b.unit})</span>
                        </div>
                      ) : b.noUnit ? (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">
                          <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                          <span>No unit</span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[9px] text-muted-foreground">
                          {b.unit === "UNIT_1" ? "Unit 1" : "Unit 2"}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MOBILE: Agenda List (< md) */}
      <div className="block md:hidden space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-1">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <span>Agenda View ({monthTitle})</span>
        </div>

        {agendaDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No bookings scheduled for this month.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {agendaDates.map((dateIso) => {
              const dayBookings = bookingsByDate.get(dateIso)!;
              const dateObj = new Date(dateIso);

              return (
                <div key={dateIso} className="space-y-2">
                  <div className="sticky top-0 bg-background/95 backdrop-blur-xs py-1 z-10 border-b">
                    <span className="text-xs font-bold text-primary">
                      {formatDateIST(dateObj)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({dayBookings.length} {dayBookings.length === 1 ? "booking" : "bookings"})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dayBookings.map((b) => (
                      <Card key={b.id} className="p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/bookings/${b.code}`}
                              className="font-mono text-xs font-bold text-primary hover:underline"
                            >
                              {b.code}
                            </Link>
                            <BookingStatusBadge status={b.status} />
                          </div>

                          <div>
                            <h3 className="font-semibold text-sm">
                              <Link href={`/bookings/${b.code}`} className="hover:underline">
                                {b.clientName}
                              </Link>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : "Time not set"}
                              {b.city && ` • ${b.city}`}
                              {b.venue && ` • ${b.venue}`}
                            </p>
                          </div>

                          {/* Unit / Clash badge */}
                          <div className="flex items-center gap-2 pt-1">
                            {b.hasClash ? (
                              <Badge variant="destructive" className="gap-1 text-xs py-0">
                                <AlertCircleIcon className="h-3 w-3" />
                                <span>Clash on {b.unit}</span>
                              </Badge>
                            ) : b.noUnit ? (
                              <Badge variant="outline" className="gap-1 text-xs border-amber-500 text-amber-700 dark:text-amber-400 py-0">
                                <AlertTriangleIcon className="h-3 w-3" />
                                <span>No unit assigned</span>
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs py-0">
                                {b.unit === "UNIT_1" ? "Unit 1" : "Unit 2"}
                              </Badge>
                            )}
                          </div>

                          {/* Quick WhatsApp / Call */}
                          <div className="flex items-center gap-2 pt-2 border-t">
                            {b.phone && (
                              <a
                                href={whatsappLink(b.phone)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Button
                                  size="xs"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs"
                                >
                                  <MessageSquareIcon className="h-3 w-3" />
                                  <span>WhatsApp</span>
                                </Button>
                              </a>
                            )}
                            {b.phone && (
                              <a href={telLink(b.phone)}>
                                <Button variant="outline" size="xs" className="h-7">
                                  <PhoneIcon className="h-3 w-3" />
                                </Button>
                              </a>
                            )}
                            <Link href={`/bookings/${b.code}`} className="ml-auto">
                              <Button variant="outline" size="xs" className="h-7 text-xs">
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
