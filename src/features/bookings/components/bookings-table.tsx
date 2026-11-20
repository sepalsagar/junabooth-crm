"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inr } from "@/lib/format";
import { formatDateIST } from "@/lib/dates";
import { telLink, whatsappLink } from "@/features/leads/phone";
import { BookingStatusBadge } from "./booking-status-badge";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  Columns3Icon,
  GridIcon,
  HistoryIcon,
  MonitorIcon,
  PhoneIcon,
} from "lucide-react";
import type { BookingStatus } from "@/generated/prisma/client";

export interface BookingListItem {
  id: string;
  code: string;
  leadCode?: string | null;
  clientName: string;
  phone: string;
  city: string | null;
  venue: string | null;
  eventDate: Date;
  startTime: string | null;
  endTime: string | null;
  packageName: string;
  basePrice: number;
  travelCharge: number;
  discount: number;
  advance: number;
  finalRecd: number;
  status: BookingStatus;
  payOnEvent: boolean;
  totalAmount: number;
  received: number;
  balance: number;
  paymentStatus: string;
  notes: string | null;
  sheetPaymentStatus?: string | null;
}

function timings(startTime: string | null, endTime: string | null): string {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return startTime;
  if (endTime) return endTime;
  return "TBD";
}

export function BookingsTable({
  bookings,
  total,
  page,
  pageSize,
  totalPages,
  currentPath,
  searchParams,
}: {
  bookings: BookingListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentPath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [viewMode, setViewMode] = useState<"fit" | "grid">("fit");

  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || !value) continue;
      params.set(key, Array.isArray(value) ? value.join(",") : value);
    }
    params.set("page", String(targetPage));
    return `${currentPath}?${params.toString()}`;
  };

  const statusParam = searchParams.status;
  const isUpcomingChecklistView = statusParam === "CONFIRMED";

  if (!bookings.length)
    return (
      <Card className="my-6 py-12 text-center">
        <CardContent>
          <p className="text-lg font-medium text-muted-foreground">No bookings found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting or clearing filters.</p>
          <Link href={currentPath}>
            <Button variant="outline" size="sm" className="mt-4">Clear filters</Button>
          </Link>
        </CardContent>
      </Card>
    );

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      {/* View Mode Bar for Desktop */}
      <div className="hidden md:flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Showing <span className="font-semibold text-foreground">{startRecord}–{endRecord}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span> bookings
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={() => setViewMode("fit")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "fit"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Compact layout fitting 100% of your screen with zero horizontal scroll"
          >
            <MonitorIcon className="size-3.5" />
            Fit Screen (No Scroll)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Multi-column grid showing all individual Excel columns"
          >
            <Columns3Icon className="size-3.5" />
            Spreadsheet Grid
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className={`hidden md:block rounded-lg border bg-card shadow-xs ${viewMode === "grid" ? "overflow-x-auto" : "overflow-hidden"}`}>
        <Table className="w-full">
          <TableHeader>
            {isUpcomingChecklistView ? (
              // Upcoming Confirmed Events View
              viewMode === "fit" ? (
                // Screen Fit Mode: 7 balanced columns
                <TableRow className="bg-muted/30">
                  <TableHead className="w-24 font-bold">Booking ID</TableHead>
                  <TableHead className="w-36 font-bold">Event &amp; Time</TableHead>
                  <TableHead className="min-w-[150px] font-bold">Client &amp; Region</TableHead>
                  <TableHead className="font-bold">Venue &amp; Location</TableHead>
                  <TableHead className="w-28 text-right font-bold">Package Fee</TableHead>
                  <TableHead className="w-28 text-right font-bold">Advance Recd</TableHead>
                  <TableHead className="w-28 text-right font-bold">Balance Due</TableHead>
                  <TableHead className="w-40 font-bold">Note / History</TableHead>
                </TableRow>
              ) : (
                // Spreadsheet Grid Mode: 11 individual columns
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10 text-center font-bold">SN</TableHead>
                  <TableHead className="font-bold">Booking ID</TableHead>
                  <TableHead className="font-bold">Event Date</TableHead>
                  <TableHead className="font-bold">Client Name</TableHead>
                  <TableHead className="font-bold">Region</TableHead>
                  <TableHead className="font-bold">Venue &amp; Address</TableHead>
                  <TableHead className="font-bold">Timings</TableHead>
                  <TableHead className="text-right font-bold">Package Fee (₹)</TableHead>
                  <TableHead className="text-right font-bold">Advance Recd (₹)</TableHead>
                  <TableHead className="text-right font-bold">Balance Due (₹)</TableHead>
                  <TableHead className="font-bold">Collection Note</TableHead>
                </TableRow>
              )
            ) : (
              // Master Operations Registry View
              viewMode === "fit" ? (
                // Screen Fit Mode: 7 balanced columns fitting 100% of the screen
                <TableRow className="bg-muted/30">
                  <TableHead className="w-28 font-bold">Booking / Lead</TableHead>
                  <TableHead className="w-36 font-bold">Date &amp; Timings</TableHead>
                  <TableHead className="min-w-[150px] font-bold">Client &amp; Region</TableHead>
                  <TableHead className="font-bold">Venue</TableHead>
                  <TableHead className="w-32 text-right font-bold">Pricing (₹)</TableHead>
                  <TableHead className="w-32 text-right font-bold">Settlement</TableHead>
                  <TableHead className="w-36 font-bold">Status</TableHead>
                  <TableHead className="w-40 font-bold">Note / History</TableHead>
                </TableRow>
              ) : (
                // Spreadsheet Grid Mode: 14 individual columns
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold">Booking ID</TableHead>
                  <TableHead className="font-bold">Lead ID</TableHead>
                  <TableHead className="font-bold">Event Date</TableHead>
                  <TableHead className="font-bold">Client Name</TableHead>
                  <TableHead className="font-bold">Region</TableHead>
                  <TableHead className="font-bold">Venue &amp; Address</TableHead>
                  <TableHead className="font-bold">Timings</TableHead>
                  <TableHead className="text-right font-bold">Offered Price (₹)</TableHead>
                  <TableHead className="text-right font-bold">Advance (₹)</TableHead>
                  <TableHead className="text-right font-bold">Balance Due (₹)</TableHead>
                  <TableHead className="text-right font-bold">Final Recd (₹)</TableHead>
                  <TableHead className="font-bold">Payment Status</TableHead>
                  <TableHead className="font-bold">Operational Status</TableHead>
                  <TableHead className="font-bold">Notes</TableHead>
                </TableRow>
              )
            )}
          </TableHeader>
          <TableBody>
            {bookings.map((booking, idx) => (
              <TableRow key={booking.id} className="hover:bg-muted/40 transition-colors">
                {isUpcomingChecklistView ? (
                  viewMode === "fit" ? (
                    // Upcoming Screen Fit row
                    <>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                          <span className="text-muted-foreground text-[10px]">#{startRecord + idx}</span>
                          <Link className="text-primary hover:underline" href={`/bookings/${booking.code}`}>
                            {booking.code}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{formatDateIST(booking.eventDate)}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {timings(booking.startTime, booking.endTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link className="font-semibold hover:underline text-xs" href={`/bookings/${booking.code}`}>
                          {booking.clientName}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          {booking.city && <span className="bg-muted px-1.5 py-0.2 rounded text-[10px] font-medium">{booking.city}</span>}
                          {booking.phone && (
                            <a className="hover:underline" href={telLink(booking.phone)}>{booking.phone}</a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs">
                        {booking.venue?.startsWith("http") ? (
                          <a href={booking.venue} target="_blank" rel="noreferrer" className="text-primary underline truncate block">
                            Map Location
                          </a>
                        ) : (
                          <span className="truncate block" title={booking.venue || ""}>
                            {booking.venue || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {inr(booking.basePrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-700">
                        {inr(booking.advance)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-bold ${booking.balance > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {inr(booking.balance)}
                      </TableCell>
                      <TableCell className="max-w-[180px] text-xs">
                        <div className="truncate text-muted-foreground text-[11px]" title={booking.notes || ""}>
                          {booking.notes || "—"}
                        </div>
                        <Link
                          href={`/bookings/${booking.code}`}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline mt-0.5"
                        >
                          <HistoryIcon className="size-3" />
                          History
                        </Link>
                      </TableCell>
                    </>
                  ) : (
                    // Upcoming Full Spreadsheet Grid row
                    <>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {startRecord + idx}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold">
                        <Link className="text-primary hover:underline" href={`/bookings/${booking.code}`}>
                          {booking.code}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-medium">
                        {formatDateIST(booking.eventDate)}
                      </TableCell>
                      <TableCell>
                        <Link className="font-medium hover:underline text-xs" href={`/bookings/${booking.code}`}>
                          {booking.clientName}
                        </Link>
                        {booking.phone && (
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <a className="hover:underline" href={telLink(booking.phone)}>{booking.phone}</a>
                            <a className="text-emerald-700 hover:text-emerald-800" href={whatsappLink(booking.phone)} target="_blank" rel="noreferrer">WA</a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{booking.city || "—"}</TableCell>
                      <TableCell className="max-w-[220px] text-xs">
                        {booking.venue?.startsWith("http") ? (
                          <a href={booking.venue} target="_blank" rel="noreferrer" className="text-primary underline truncate block">
                            Map Location
                          </a>
                        ) : (
                          <span className="truncate block" title={booking.venue || ""}>
                            {booking.venue || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {timings(booking.startTime, booking.endTime)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {inr(booking.basePrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-700">
                        {inr(booking.advance)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-bold ${booking.balance > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {inr(booking.balance)}
                      </TableCell>
                      <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                        <span className="line-clamp-2" title={booking.notes || ""}>
                          {booking.notes || "—"}
                        </span>
                      </TableCell>
                    </>
                  )
                ) : (
                  viewMode === "fit" ? (
                    // Master Bookings Screen Fit row (fits 100% of screen)
                    <>
                      <TableCell>
                        <Link className="font-mono text-xs font-bold text-primary hover:underline block" href={`/bookings/${booking.code}`}>
                          {booking.code}
                        </Link>
                        {booking.leadCode ? (
                          <Link className="font-mono text-[10px] text-muted-foreground hover:underline" href={`/leads/${booking.leadCode}`}>
                            {booking.leadCode}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium whitespace-nowrap">{formatDateIST(booking.eventDate)}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                          {timings(booking.startTime, booking.endTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link className="font-medium hover:underline text-xs block truncate max-w-[160px]" href={`/bookings/${booking.code}`}>
                          {booking.clientName}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                          {booking.city && <span className="bg-muted px-1.5 py-0.2 rounded text-[10px] font-medium">{booking.city}</span>}
                          {booking.phone && <a className="hover:underline text-[10px]" href={telLink(booking.phone)}>{booking.phone}</a>}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[160px] text-xs">
                        {booking.venue?.startsWith("http") ? (
                          <a href={booking.venue} target="_blank" rel="noreferrer" className="text-primary underline truncate block">
                            Map Location
                          </a>
                        ) : (
                          <span className="truncate block" title={booking.venue || ""}>
                            {booking.venue || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-xs font-semibold">{inr(booking.basePrice)}</div>
                        <div className="text-[10px] text-muted-foreground">Adv: {inr(booking.advance)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`text-xs font-bold ${booking.balance > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          Due: {inr(booking.balance)}
                        </div>
                        {booking.finalRecd > 0 && (
                          <div className="text-[10px] text-emerald-700">Recd: {inr(booking.finalRecd)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
                            {booking.paymentStatus || "—"}
                          </span>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[160px] text-xs">
                        <div className="truncate text-[11px] text-muted-foreground" title={booking.notes || ""}>
                          {booking.notes || "—"}
                        </div>
                        <Link
                          href={`/bookings/${booking.code}`}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline mt-0.5"
                        >
                          <HistoryIcon className="size-3" />
                          History
                        </Link>
                      </TableCell>
                    </>
                  ) : (
                    // Master Bookings Full Spreadsheet Grid row (14 columns)
                    <>
                      <TableCell className="font-mono text-xs font-bold">
                        <Link className="text-primary hover:underline" href={`/bookings/${booking.code}`}>
                          {booking.code}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {booking.leadCode ? (
                          <Link className="hover:underline hover:text-foreground" href={`/leads/${booking.leadCode}`}>
                            {booking.leadCode}
                          </Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-medium">
                        {formatDateIST(booking.eventDate)}
                      </TableCell>
                      <TableCell>
                        <Link className="font-medium hover:underline text-xs" href={`/bookings/${booking.code}`}>
                          {booking.clientName}
                        </Link>
                        {booking.phone && (
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <a className="hover:underline" href={telLink(booking.phone)}>{booking.phone}</a>
                            <a className="text-emerald-700 hover:text-emerald-800" href={whatsappLink(booking.phone)} target="_blank" rel="noreferrer">WA</a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{booking.city || "—"}</TableCell>
                      <TableCell className="max-w-[200px] text-xs">
                        {booking.venue?.startsWith("http") ? (
                          <a href={booking.venue} target="_blank" rel="noreferrer" className="text-primary underline truncate block">
                            Map Location
                          </a>
                        ) : (
                          <span className="truncate block" title={booking.venue || ""}>
                            {booking.venue || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {timings(booking.startTime, booking.endTime)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {inr(booking.basePrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {inr(booking.advance)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-bold ${booking.balance > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {inr(booking.balance)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-700">
                        {booking.finalRecd > 0 ? inr(booking.finalRecd) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
                          {booking.paymentStatus || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <BookingStatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell className="max-w-[160px] text-xs text-muted-foreground">
                        <span className="line-clamp-2" title={booking.notes || ""}>
                          {booking.notes || "—"}
                        </span>
                      </TableCell>
                    </>
                  )
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {bookings.map((booking, idx) => (
          <Card key={booking.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                  <span className="text-muted-foreground">#{startRecord + idx}</span>
                  <span>·</span>
                  <Link href={`/bookings/${booking.code}`} className="text-primary underline">
                    {booking.code}
                  </Link>
                  {booking.leadCode && (
                    <span className="text-muted-foreground font-normal">({booking.leadCode})</span>
                  )}
                </div>
                <h3 className="mt-1 font-semibold text-sm">
                  <Link href={`/bookings/${booking.code}`}>{booking.clientName}</Link>
                </h3>
                {booking.city && <p className="text-xs text-muted-foreground">{booking.city}</p>}
              </div>
              <BookingStatusBadge status={booking.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-2 text-xs">
              <div>
                <span className="text-muted-foreground">Event: </span>
                <span className="font-medium">{formatDateIST(booking.eventDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time: </span>
                <span>{timings(booking.startTime, booking.endTime)}</span>
              </div>
              {booking.venue && (
                <div className="col-span-2 truncate">
                  <span className="text-muted-foreground">Venue: </span>
                  {booking.venue.startsWith("http") ? (
                    <a href={booking.venue} target="_blank" rel="noreferrer" className="text-primary underline">
                      Open Map
                    </a>
                  ) : (
                    <span>{booking.venue}</span>
                  )}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Price/Fee: </span>
                <span className="font-semibold">{inr(booking.basePrice)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Advance: </span>
                <span className="text-emerald-700 font-medium">{inr(booking.advance)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Balance: </span>
                <span className={`font-bold ${booking.balance > 0 ? "text-primary" : ""}`}>
                  {inr(booking.balance)}
                </span>
              </div>
              {booking.finalRecd > 0 && (
                <div>
                  <span className="text-muted-foreground">Final Recd: </span>
                  <span className="text-emerald-700 font-medium">{inr(booking.finalRecd)}</span>
                </div>
              )}
              {booking.paymentStatus && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Payment: </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                    {booking.paymentStatus}
                  </span>
                </div>
              )}
              {booking.notes && (
                <div className="col-span-2 text-muted-foreground">
                  <span>Note: </span>
                  <span>{booking.notes}</span>
                </div>
              )}
            </div>

            {booking.phone && (
              <div className="flex items-center justify-between border-t pt-2">
                <div className="flex gap-2">
                  <a href={telLink(booking.phone)}>
                    <Button size="xs" variant="outline" className="gap-1">
                      <PhoneIcon className="h-3.5 w-3.5" /> Call
                    </Button>
                  </a>
                  <a href={whatsappLink(booking.phone)} target="_blank" rel="noreferrer">
                    <Button size="xs" className="bg-emerald-600 text-white hover:bg-emerald-700">WA</Button>
                  </a>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 pt-2 text-sm text-muted-foreground sm:flex-row">
        <div>
          Showing <span className="font-medium text-foreground">{startRecord}</span>
          –<span className="font-medium text-foreground">{endRecord}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> bookings
        </div>
        <div className="flex items-center gap-1">
          <Link href={page > 1 ? getPageUrl(page - 1) : "#"} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
            <Button variant="outline" size="sm" disabled={page <= 1}>
              <ChevronLeftIcon /> Previous
            </Button>
          </Link>
          <span className="px-3 text-xs font-medium">Page {page} of {totalPages}</span>
          <Link href={page < totalPages ? getPageUrl(page + 1) : "#"} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
            <Button variant="outline" size="sm" disabled={page >= totalPages}>
              Next <ChevronRightIcon />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
