import { requireRole } from "@/lib/auth-guards";
import { parseMonth } from "@/features/metrics/filters";
import { getBookingFacets } from "@/features/bookings/queries";
import { getCalendarBookings } from "@/features/calendar/queries";
import { CalendarView } from "@/features/calendar/components/calendar-view";

interface CalendarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  // Calendar is accessible to PARTNER and SALES
  await requireRole(["PARTNER", "SALES"]);

  const params = await searchParams;
  const rawMonth = typeof params.month === "string" ? params.month : undefined;
  const rawCity = typeof params.city === "string" && params.city !== "all" ? params.city : undefined;

  const currentMonth = parseMonth(rawMonth);

  const [bookings, facets] = await Promise.all([
    getCalendarBookings(currentMonth, rawCity),
    getBookingFacets(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Monthly schedule, slot occupancy, and unit clash detection
        </p>
      </div>

      <CalendarView
        currentMonth={currentMonth}
        selectedCity={rawCity}
        cities={facets.cities}
        bookings={bookings}
      />
    </div>
  );
}
