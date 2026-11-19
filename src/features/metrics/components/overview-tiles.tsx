import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { inr } from "@/lib/format";
import { formatDateIST } from "@/lib/dates";
import { CalendarIcon, IndianRupeeIcon, WalletIcon, TrendingUpIcon, AlertCircleIcon } from "lucide-react";

interface OverviewTilesProps {
  bookedThisMonth: { count: number; total: number };
  balanceToCollect: number;
  receivedToDate: number;
  nextEvent?: { clientName: string; eventDate: Date | string } | null;
  cashInHand?: number | null; // ABSENT if not PARTNER
}

export function OverviewTiles({
  bookedThisMonth,
  balanceToCollect,
  receivedToDate,
  nextEvent,
  cashInHand,
}: OverviewTilesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {/* Booked this month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-medium text-muted-foreground">Booked this month</span>
          <TrendingUpIcon className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inr(bookedThisMonth.total)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {bookedThisMonth.count} active {bookedThisMonth.count === 1 ? "booking" : "bookings"}
          </p>
        </CardContent>
      </Card>

      {/* Balance to collect */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-medium text-muted-foreground">Balance to collect</span>
          <AlertCircleIcon className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-500">
            {inr(balanceToCollect)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across active confirmed bookings
          </p>
        </CardContent>
      </Card>

      {/* Received to date */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-medium text-muted-foreground">Received to date</span>
          <IndianRupeeIcon className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">
            {inr(receivedToDate)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Live collections to date
          </p>
        </CardContent>
      </Card>

      {/* Upcoming events (next event) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-xs font-medium text-muted-foreground">Upcoming events</span>
          <CalendarIcon className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          {nextEvent ? (
            <>
              <div className="text-base font-bold truncate" title={nextEvent.clientName}>
                {nextEvent.clientName}
              </div>
              <p className="text-xs font-medium text-primary mt-1">
                {formatDateIST(nextEvent.eventDate)}
              </p>
            </>
          ) : (
            <>
              <div className="text-base font-medium text-muted-foreground">None upcoming</div>
              <p className="text-xs text-muted-foreground mt-1">Slots open</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cash in hand (PARTNER ONLY: server omits if not partner) */}
      {cashInHand !== undefined && cashInHand !== null && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-primary font-semibold">Cash in hand</span>
            <WalletIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{inr(cashInHand)}</div>
            <p className="text-xs text-muted-foreground mt-1">Injected + rec&apos;d - exp - withdr</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
