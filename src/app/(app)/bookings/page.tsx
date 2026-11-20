import { requireRole } from "@/lib/auth-guards";
import { parseBookingFilters } from "@/features/bookings/filters";
import { getBookingFacets, getBookings } from "@/features/bookings/queries";
import { BookingFilters } from "@/features/bookings/components/booking-filters";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { NewBookingSheet } from "@/features/bookings/components/new-booking-sheet";
import { StatusTabBar } from "@/components/ui/status-tab-bar";
import { Card, CardContent } from "@/components/ui/card";
import { inr } from "@/lib/format";
import { CalendarCheckIcon, IndianRupeeIcon, ClockIcon, LayersIcon } from "lucide-react";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["PARTNER", "SALES"]);
  const rawParams = await searchParams;
  const filters = parseBookingFilters(rawParams);
  const [data, facets] = await Promise.all([getBookings(filters), getBookingFacets()]);

  const upcoming = facets.upcomingTotals;
  const statusTabs = [
    { value: "CONFIRMED", label: "Upcoming Confirmed", count: facets.statusCounts["CONFIRMED"] ?? 0 },
    { value: "COMPLETED", label: "Completed Events", count: facets.statusCounts["COMPLETED"] ?? 0 },
    { value: "CANCELLED", label: "Cancelled", count: facets.statusCounts["CANCELLED"] ?? 0 },
  ];

  const isConfirmedView = rawParams.status === "CONFIRMED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isConfirmedView ? "Upcoming Confirmed Events & Checklist" : "Master Bookings & Operations Registry"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isConfirmedView
              ? "Onsite checklist and collection details for upcoming confirmed events."
              : "Complete operations registry matching the master spreadsheet."}
          </p>
        </div>
        <NewBookingSheet packages={facets.packages} />
      </div>

      {/* Spreadsheet Header Totals Banner (Matches Upcoming Confirmed Events header in spreadsheet) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3 bg-card shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <CalendarCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Upcoming Events</p>
              <p className="text-lg font-bold">{upcoming.count}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 bg-card shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="rounded-md bg-blue-500/10 p-2 text-blue-600">
              <LayersIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Package Fee</p>
              <p className="text-lg font-bold">{inr(upcoming.packageFee)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 bg-card shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600">
              <IndianRupeeIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Advance Recd</p>
              <p className="text-lg font-bold text-emerald-600">{inr(upcoming.advanceRecd)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 bg-card shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-600">
              <ClockIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Balance Due</p>
              <p className="text-lg font-bold text-primary">{inr(upcoming.balanceDue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subparts Filter Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <StatusTabBar tabs={statusTabs} />
        </div>

        {/* Filters bar */}
        <BookingFilters facets={facets} totalCount={data.total} />
      </div>

      {/* Bookings Table matching spreadsheet columns */}
      <BookingsTable
        bookings={data.bookings as any}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        totalPages={data.totalPages}
        currentPath="/bookings"
        searchParams={rawParams}
      />
    </div>
  );
}
