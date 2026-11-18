import { requireRole } from "@/lib/auth-guards";
import { parseBookingFilters } from "@/features/bookings/filters";
import { getBookingFacets, getBookings } from "@/features/bookings/queries";
import { BookingFilters } from "@/features/bookings/components/booking-filters";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { NewBookingSheet } from "@/features/bookings/components/new-booking-sheet";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(["PARTNER", "SALES"]);
  const rawParams = await searchParams;
  const filters = parseBookingFilters(rawParams);
  const [data, facets] = await Promise.all([getBookings(filters), getBookingFacets()]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">All bookings</h1><p className="mt-0.5 text-sm text-muted-foreground">Manage confirmed events, balances and payment history.</p></div>
        <NewBookingSheet packages={facets.packages} />
      </div>
      <BookingFilters facets={facets} totalCount={data.total} />
      <BookingsTable bookings={data.bookings} total={data.total} page={data.page} pageSize={data.pageSize} totalPages={data.totalPages} currentPath="/bookings" searchParams={rawParams} />
    </div>
  );
}
