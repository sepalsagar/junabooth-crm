import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth-guards";
import type { Role } from "@/lib/permissions";
import { formatDateIST, startOfTodayIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { telLink, whatsappLink } from "@/features/leads/phone";
import { StatusBadge } from "@/features/leads/components/status-badge";
import { getFollowUpsDue } from "@/features/leads/queries";
import { getCollections, getBookingFacets } from "@/features/bookings/queries";
import {
  getBalanceToCollect,
  getBookedThisMonth,
  getCashPosition,
  getEventsByCity,
  getLeadsByStatus,
  getReceivedToDate,
  getRevenueByMonth,
  getUpcomingEvents,
} from "@/features/metrics/queries";
import { parseOverviewFilters } from "@/features/metrics/filters";
import { overviewSections } from "@/features/metrics/overview-sections";
import { OverviewFiltersBar } from "@/features/metrics/components/overview-filters-bar";
import { OverviewTiles } from "@/features/metrics/components/overview-tiles";
import { RevenueByMonthChart } from "@/features/metrics/components/revenue-by-month-chart";
import { EventsByCityChart } from "@/features/metrics/components/events-by-city-chart";
import { LeadsByStatusChart } from "@/features/metrics/components/leads-by-status-chart";
import { UpcomingEventsList } from "@/features/metrics/components/upcoming-events-list";
import { CollectThisWeekList } from "@/features/metrics/components/collect-this-week-list";
import { ClockAlertIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";

interface OverviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const session = await requireUser();
  const role = session.user.role as Role;
  const sections = overviewSections(role);

  const rawParams = await searchParams;
  const filters = parseOverviewFilters(rawParams);
  const city = filters.city ?? undefined;

  const now = new Date();
  const startToday = startOfTodayIST(now);

  // Run independent queries in parallel via Promise.all
  const [
    bookedMonth,
    balanceToCollect,
    receivedToDate,
    upcomingEventsList,
    cashPositionResult,
    revenueData,
    eventsByCityData,
    leadsByStatusData,
    followUps,
    collectWeekItems,
    facets,
  ] = await Promise.all([
    getBookedThisMonth(undefined, city),
    getBalanceToCollect(),
    getReceivedToDate(),
    getUpcomingEvents(10, city),
    // Guarded query: only run cash calculation if user is PARTNER
    sections.showCash ? getCashPosition() : Promise.resolve(null),
    // Guarded query: only run revenue chart if role is allowed to see revenue
    sections.showRevenueChart ? getRevenueByMonth(city) : Promise.resolve([]),
    getEventsByCity(),
    getLeadsByStatus(),
    getFollowUpsDue(now),
    getCollections("week"),
    getBookingFacets(),
  ]);

  const nextEvent = upcomingEventsList[0]
    ? {
        clientName: upcomingEventsList[0].clientName,
        eventDate: upcomingEventsList[0].eventDate,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key operational metrics, pipeline status, and upcoming events
          </p>
        </div>

        <OverviewFiltersBar
          currentRange={filters.range}
          currentCity={filters.city ?? undefined}
          availableCities={facets.cities}
        />
      </div>

      {/* Tiles Row */}
      <Suspense fallback={<TilesSkeleton />}>
        <OverviewTiles
          bookedThisMonth={bookedMonth}
          balanceToCollect={balanceToCollect}
          receivedToDate={receivedToDate}
          nextEvent={nextEvent}
          cashInHand={sections.showCash ? cashPositionResult?.total ?? null : null}
        />
      </Suspense>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {sections.showRevenueChart && (
          <Suspense fallback={<CardSkeleton />}>
            <RevenueByMonthChart data={revenueData} />
          </Suspense>
        )}

        {sections.showCityChart && (
          <Suspense fallback={<CardSkeleton />}>
            <EventsByCityChart data={eventsByCityData} />
          </Suspense>
        )}

        {sections.showLeadsChart && (
          <div className={sections.showRevenueChart ? "lg:col-span-2" : "lg:col-span-1"}>
            <Suspense fallback={<CardSkeleton />}>
              <LeadsByStatusChart data={leadsByStatusData} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Operational Lists Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Events Table with Unit/Clash warnings */}
        {sections.showUpcomingEvents && (
          <Suspense fallback={<CardSkeleton />}>
            <UpcomingEventsList events={upcomingEventsList} />
          </Suspense>
        )}

        {/* Collect this week */}
        {sections.showCollectThisWeek && (
          <Suspense fallback={<CardSkeleton />}>
            <CollectThisWeekList items={collectWeekItems} />
          </Suspense>
        )}
      </div>

      {/* Follow Up Today Card */}
      {sections.showFollowUpToday && (
        <section>
          <Card className="border-primary/20 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ClockAlertIcon className="h-4 w-4 text-primary" />
                  <span>Follow Up Today</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({followUps.length} overdue or due today)
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Prioritize reaching out to these leads to keep the pipeline moving.
                </CardDescription>
              </div>
              <Link href="/leads?followUp=today">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  View in Leads
                </Button>
              </Link>
            </CardHeader>

            <CardContent>
              {followUps.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  All caught up! No follow-ups overdue or due today.
                </p>
              ) : (
                <div className="divide-y rounded-md border text-sm">
                  {followUps.slice(0, 6).map((lead) => {
                    const isOverdue =
                      lead.nextFollowUp && new Date(lead.nextFollowUp) < startToday;

                    return (
                      <div
                        key={lead.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/leads/${lead.code}`}
                              className="font-mono text-xs font-bold text-primary hover:underline"
                            >
                              {lead.code}
                            </Link>
                            <span className="font-semibold text-sm">
                              <Link href={`/leads/${lead.code}`}>
                                {lead.clientName}
                              </Link>
                            </span>
                            <StatusBadge status={lead.status} />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {lead.city && <span>{lead.city}</span>}
                            {lead.eventType && <span>• {lead.eventType}</span>}
                            {lead.quotedAmount !== null && lead.quotedAmount !== undefined && (
                              <span>• {inr(lead.quotedAmount)}</span>
                            )}
                            <span
                              className={
                                isOverdue
                                  ? "font-semibold text-primary"
                                  : "text-foreground"
                              }
                            >
                              • Due: {formatDateIST(lead.nextFollowUp)}
                              {isOverdue && " (Overdue)"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {lead.phone && (
                            <a
                              href={whatsappLink(lead.phone)}
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
                          {lead.phone && (
                            <a href={telLink(lead.phone)}>
                              <Button variant="outline" size="xs" className="h-7">
                                <PhoneIcon className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function TilesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-36 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}
