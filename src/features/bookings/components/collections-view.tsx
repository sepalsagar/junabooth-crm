"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { formatDateIST } from "@/lib/dates";
import { telLink, whatsappLink } from "@/features/leads/phone";
import { BookingStatusBadge } from "./booking-status-badge";
import { PaymentStatusBadge } from "./payment-status-badge";
import type { CollectionItem } from "../queries";

export function CollectionsView({
  view,
  items,
  totals,
}: {
  view: "week" | "overdue";
  items: CollectionItem[];
  totals: { dueThisWeek: number; overdue: number };
}) {
  const title = view === "week" ? "Due this week" : "Overdue collections";
  const total = view === "week" ? totals.dueThisWeek : totals.overdue;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{items.length} active booking(s) with an unpaid balance</p></div>
        <Card className="min-w-48"><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-primary">{inr(total)}</CardContent></Card>
      </div>
      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No collections match this view.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/bookings/${item.code}`} className="font-mono text-xs font-bold text-primary underline">{item.code}</Link>
                  <h2 className="font-semibold"><Link href={`/bookings/${item.code}`}>{item.clientName}</Link></h2>
                  <p className="text-xs text-muted-foreground">{item.city || "No city"} - {formatDateIST(item.eventDate)} - {item.venue || "Venue not set"}</p>
                  <div className="mt-2 flex flex-wrap gap-2"><BookingStatusBadge status={item.status} /><PaymentStatusBadge status={item.paymentStatus} payOnEvent={item.payOnEvent} /></div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right"><p className="text-xs text-muted-foreground">Balance</p><p className="text-xl font-bold text-primary">{inr(item.balance)}</p></div>
                  <div className="flex gap-2"><a href={telLink(item.phone)}><Button variant="outline" size="sm">Call</Button></a><a href={whatsappLink(item.phone)} target="_blank" rel="noreferrer"><Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">WhatsApp</Button></a></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
