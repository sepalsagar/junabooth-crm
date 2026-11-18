"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inr } from "@/lib/format";
import { formatDateIST } from "@/lib/dates";
import { telLink, whatsappLink } from "@/features/leads/phone";
import { BookingStatusBadge } from "./booking-status-badge";
import { PaymentStatusBadge } from "./payment-status-badge";
import { ChevronLeftIcon, ChevronRightIcon, PhoneIcon } from "lucide-react";
import type { BookingStatus } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/lib/calc";

export interface BookingListItem {
  id: string;
  code: string;
  clientName: string;
  phone: string;
  city: string | null;
  eventDate: Date;
  packageName: string;
  status: BookingStatus;
  payOnEvent: boolean;
  totalAmount: number;
  received: number;
  balance: number;
  paymentStatus: PaymentStatus;
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
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || !value) continue;
      params.set(key, Array.isArray(value) ? value.join(",") : value);
    }
    params.set("page", String(targetPage));
    return `${currentPath}?${params.toString()}`;
  };

  if (!bookings.length) {
    return <Card className="my-6 py-12 text-center"><CardContent><p className="text-lg font-medium text-muted-foreground">No bookings found</p><p className="mt-1 text-sm text-muted-foreground">Try adjusting or clearing filters.</p><Link href={currentPath}><Button variant="outline" size="sm" className="mt-4">Clear filters</Button></Link></CardContent></Card>;
  }

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-xs md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Client</TableHead><TableHead>City</TableHead><TableHead>Event date</TableHead><TableHead>Package</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-xs font-semibold"><Link className="text-primary underline" href={`/bookings/${booking.code}`}>{booking.code}</Link></TableCell>
                <TableCell><Link className="font-medium hover:underline" href={`/bookings/${booking.code}`}>{booking.clientName}</Link><div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground"><a className="hover:underline" href={telLink(booking.phone)}>{booking.phone}</a><a className="text-emerald-700" href={whatsappLink(booking.phone)} target="_blank" rel="noreferrer">WA</a></div></TableCell>
                <TableCell className="text-xs">{booking.city || "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{formatDateIST(booking.eventDate)}</TableCell>
                <TableCell className="text-xs">{booking.packageName}</TableCell>
                <TableCell className="text-right text-xs font-medium">{inr(booking.totalAmount)}</TableCell>
                <TableCell className="text-right text-xs">{inr(booking.received)}</TableCell>
                <TableCell className={`text-right text-xs font-semibold ${booking.balance > 0 ? "text-primary" : "text-foreground"}`}>{inr(booking.balance)}</TableCell>
                <TableCell><BookingStatusBadge status={booking.status} /></TableCell>
                <TableCell><PaymentStatusBadge status={booking.paymentStatus} payOnEvent={booking.payOnEvent} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {bookings.map((booking) => (
          <Card key={booking.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div><Link href={`/bookings/${booking.code}`} className="font-mono text-xs font-bold text-primary underline">{booking.code}</Link><h3 className="mt-0.5 font-semibold"><Link href={`/bookings/${booking.code}`}>{booking.clientName}</Link></h3></div>
              <BookingStatusBadge status={booking.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
              <span className="text-muted-foreground">{booking.city || "No city"}</span><span>{formatDateIST(booking.eventDate)}</span>
              <span>{booking.packageName}</span><span className="font-semibold">Total {inr(booking.totalAmount)}</span>
              <span>Received {inr(booking.received)}</span><span className={booking.balance > 0 ? "font-semibold text-primary" : ""}>Balance {inr(booking.balance)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3"><PaymentStatusBadge status={booking.paymentStatus} payOnEvent={booking.payOnEvent} /><div className="flex gap-2"><a href={telLink(booking.phone)} title="Call"><Button size="icon-xs" variant="outline"><PhoneIcon /></Button></a><a href={whatsappLink(booking.phone)} target="_blank" rel="noreferrer"><Button size="xs" className="bg-emerald-600 text-white hover:bg-emerald-700">WA</Button></a></div></div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 pt-2 text-sm text-muted-foreground sm:flex-row">
        <div>Showing <span className="font-medium text-foreground">{startRecord}</span>-<span className="font-medium text-foreground">{endRecord}</span> of <span className="font-medium text-foreground">{total}</span> bookings</div>
        <div className="flex items-center gap-1">
          <Link href={page > 1 ? getPageUrl(page - 1) : "#"} className={page <= 1 ? "pointer-events-none opacity-50" : ""}><Button variant="outline" size="sm" disabled={page <= 1}><ChevronLeftIcon />Previous</Button></Link>
          <span className="px-3 text-xs font-medium">Page {page} of {totalPages}</span>
          <Link href={page < totalPages ? getPageUrl(page + 1) : "#"} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}><Button variant="outline" size="sm" disabled={page >= totalPages}>Next<ChevronRightIcon /></Button></Link>
        </div>
      </div>
    </div>
  );
}
