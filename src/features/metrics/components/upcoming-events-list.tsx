import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/format";
import { formatDateIST } from "@/lib/dates";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { AlertTriangleIcon, AlertCircleIcon, CalendarIcon } from "lucide-react";
import type { BookingStatus, BoothUnit } from "@/generated/prisma/client";

interface UpcomingBookingItem {
  id: string;
  code: string;
  clientName: string;
  phone: string;
  city?: string | null;
  venue?: string | null;
  eventDate: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  unit?: BoothUnit | null;
  status: BookingStatus;
  totalAmount: number;
  balance: number;
  hasClash: boolean;
  noUnit: boolean;
}

interface UpcomingEventsListProps {
  events: UpcomingBookingItem[];
}

export function UpcomingEventsList({ events }: UpcomingEventsListProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span>Upcoming Events</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Next scheduled bookings, balance due, and booth unit assignment
          </CardDescription>
        </div>
        <Link href="/bookings" className="text-xs text-primary hover:underline font-medium">
          All bookings &rarr;
        </Link>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No upcoming events scheduled.
          </p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {events.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/bookings/${b.code}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {b.code}
                    </Link>
                    <span className="font-semibold">{b.clientName}</span>
                    <BookingStatusBadge status={b.status} />

                    {/* Unit / Clash warnings */}
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

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDateIST(b.eventDate)}</span>
                    {b.startTime && b.endTime && <span>• {b.startTime} - {b.endTime}</span>}
                    {b.city && <span>• {b.city}</span>}
                    {b.venue && <span>• {b.venue}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Balance due</span>
                    <span className={`font-mono text-xs font-semibold ${b.balance > 0 ? "text-amber-700 dark:text-amber-400 font-bold" : "text-muted-foreground"}`}>
                      {inr(b.balance)}
                    </span>
                  </div>
                  <Link href={`/bookings/${b.code}`} className="text-xs text-primary hover:underline font-medium">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
