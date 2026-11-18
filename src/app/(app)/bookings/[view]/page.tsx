import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guards";
import { parseBookingFilters } from "@/features/bookings/filters";
import { getBooking, getBookingFacets, getBookings } from "@/features/bookings/queries";
import { BookingFilters } from "@/features/bookings/components/booking-filters";
import { BookingsTable } from "@/features/bookings/components/bookings-table";
import { NewBookingSheet } from "@/features/bookings/components/new-booking-sheet";
import { BookingDetailView } from "@/features/bookings/components/booking-detail-view";
import type { BookingStatusType } from "@/features/bookings/schema";

const VIEW_CONFIG: Record<string, { title: string; subtitle: string; statuses: BookingStatusType[] }> = {
  all: { title: "All bookings", subtitle: "Complete event schedule.", statuses: [] },
  option: { title: "Option bookings", subtitle: "Tentative holds awaiting confirmation.", statuses: ["OPTION"] },
  confirmed: { title: "Confirmed bookings", subtitle: "Confirmed events ready for delivery.", statuses: ["CONFIRMED"] },
  "in-progress": { title: "In-progress bookings", subtitle: "Events currently being delivered.", statuses: ["IN_PROGRESS"] },
  completed: { title: "Completed bookings", subtitle: "Delivered events and final balances.", statuses: ["COMPLETED"] },
  cancelled: { title: "Cancelled bookings", subtitle: "Cancelled events and refund records.", statuses: ["CANCELLED"] },
  postponed: { title: "Postponed bookings", subtitle: "Events moved to a later date.", statuses: ["POSTPONED"] },
};

export default async function BookingViewOrDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["PARTNER", "SALES"]);
  const { view } = await params;
  const viewKey = view.toLowerCase();

  if (viewKey in VIEW_CONFIG) {
    const config = VIEW_CONFIG[viewKey];
    const rawParams = await searchParams;
    const filters = parseBookingFilters(rawParams);
    if (!rawParams.status && config.statuses.length) filters.status = [...config.statuses];
    const [data, facets] = await Promise.all([getBookings(filters), getBookingFacets()]);
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-bold tracking-tight">{config.title}</h1><p className="mt-0.5 text-sm text-muted-foreground">{config.subtitle}</p></div>
          <NewBookingSheet packages={facets.packages} />
        </div>
        <BookingFilters facets={facets} totalCount={data.total} />
        <BookingsTable bookings={data.bookings} total={data.total} page={data.page} pageSize={data.pageSize} totalPages={data.totalPages} currentPath={`/bookings/${viewKey}`} searchParams={rawParams} />
      </div>
    );
  }

  const booking = await getBooking(view);
  if (!booking) notFound();
  const facets = await getBookingFacets();
  return <BookingDetailView booking={booking} packages={facets.packages} role={session.user.role as "PARTNER" | "SALES" | "OPERATOR"} />;
}
