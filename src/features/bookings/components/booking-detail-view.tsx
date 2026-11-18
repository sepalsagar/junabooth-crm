"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateIST, formatDateTimeIST, toISODateStringIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { telLink, whatsappLink } from "@/features/leads/phone";
import type { getBooking } from "../queries";
import { cancelBooking, changeBookingStatus, recordPayment, updateBooking, voidPayment } from "../actions";
import { ALLOWED_TRANSITIONS } from "../rules";
import { BOOKING_TYPES, PAYMENT_KINDS, PAYMENT_MODES, PRINT_SIZES, type BookingTypeKind, type PaymentKindType, type PaymentModeType } from "../schema";
import { eventProfit } from "@/features/expenses/profit";
import { BookingStatusBadge } from "./booking-status-badge";
import { PaymentStatusBadge } from "./payment-status-badge";

type Booking = NonNullable<Awaited<ReturnType<typeof getBooking>>>;

export function BookingDetailView({
  booking,
  packages,
  role,
}: {
  booking: Booking;
  packages: { id: string; name: string; price: number; hours: number }[];
  role: "PARTNER" | "SALES" | "OPERATOR";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [packageId, setPackageId] = useState(booking.packageId ?? "");
  const [packageName, setPackageName] = useState(booking.packageName);
  const [basePrice, setBasePrice] = useState(String(booking.basePrice));
  const [travelCharge, setTravelCharge] = useState(String(booking.travelCharge));
  const [discount, setDiscount] = useState(String(booking.discount));
  const [statusOpen, setStatusOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const run = (operation: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    startTransition(async () => {
      const result = await operation();
      if (!result.ok) {
        toast.error(result.error || "Action failed");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  };

  const submitDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => updateBooking({
        id: booking.id,
        clientName: String(form.get("clientName")),
        phone: String(form.get("phone")),
        city: String(form.get("city") || "") || undefined,
        venue: String(form.get("venue") || "") || undefined,
        mapLink: String(form.get("mapLink") || "") || undefined,
        eventDate: String(form.get("eventDate")),
        startTime: String(form.get("startTime") || "") || undefined,
        endTime: String(form.get("endTime") || "") || undefined,
        packageId: packageId || undefined,
        packageName,
        basePrice: Number(basePrice),
        travelCharge: Number(travelCharge),
        discount: Number(discount),
        type: String(form.get("type")) as BookingTypeKind,
        payOnEvent: form.get("payOnEvent") === "on",
        dayContact: String(form.get("dayContact") || "") || undefined,
        notes: String(form.get("notes") || "") || undefined,
        priceEditReason: String(form.get("priceEditReason") || "") || undefined,
      }),
      "Booking details updated"
    );
  };

  const submitStatus = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => changeBookingStatus({
        bookingId: booking.id,
        status: String(form.get("status")) as typeof booking.status,
        newEventDate: String(form.get("newEventDate") || "") || undefined,
        reason: String(form.get("reason") || "") || undefined,
        printSize: String(form.get("printSize") || "") as "TWO_BY_SIX" | "FOUR_BY_SIX" | undefined,
        printsUsed: String(form.get("printsUsed") || "") ? Number(form.get("printsUsed")) : undefined,
      }),
      "Booking status updated"
    );
  };

  const submitPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => recordPayment({
        bookingId: booking.id,
        amount: Number(form.get("amount")),
        paidOn: String(form.get("paidOn")),
        kind: String(form.get("kind")) as PaymentKindType,
        mode: String(form.get("mode")) as PaymentModeType,
        receivedBy: String(form.get("receivedBy")),
        reference: String(form.get("reference") || "") || undefined,
        note: String(form.get("note") || "") || undefined,
      }),
      "Payment recorded"
    );
  };

  const submitVoid = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => voidPayment({ paymentId: String(form.get("paymentId")), reason: String(form.get("reason")) }),
      "Payment voided"
    );
  };

  const submitCancel = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () => cancelBooking({
        bookingId: booking.id,
        refundAmount: Number(form.get("refundAmount") || 0),
        refundMode: String(form.get("refundMode") || "UPI") as PaymentModeType,
        reason: String(form.get("reason")),
      }),
      "Booking cancelled"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/bookings" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="h-3.5 w-3.5" />Back to bookings</Link>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold">{booking.code}</h1><BookingStatusBadge status={booking.status} /><PaymentStatusBadge status={booking.paymentStatus} payOnEvent={booking.payOnEvent} /></div>
          <p className="mt-1 text-sm text-muted-foreground">{booking.clientName} - {formatDateIST(booking.eventDate)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.phone && <a href={whatsappLink(booking.phone)} target="_blank" rel="noreferrer"><Button className="bg-emerald-600 text-white hover:bg-emerald-700"><MessageSquareIcon />WhatsApp</Button></a>}
          {booking.phone && <a href={telLink(booking.phone)}><Button variant="outline"><PhoneIcon />Call</Button></a>}
          <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
            <DialogTrigger render={<Button variant="outline" />}>Change status</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Change booking status</DialogTitle><DialogDescription>Only permitted status transitions are available.</DialogDescription></DialogHeader>
              <form onSubmit={(event) => { submitStatus(event); setStatusOpen(false); }} className="space-y-3">
                <div className="space-y-1"><Label htmlFor="status">New status</Label><select id="status" name="status" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" required><option value="">Select status</option>{ALLOWED_TRANSITIONS[booking.status].map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                {booking.status === "POSTPONED" && <div className="space-y-1"><Label htmlFor="newEventDate">New event date</Label><Input id="newEventDate" name="newEventDate" type="date" /></div>}
                <div className="space-y-1"><Label htmlFor="reason">Reason</Label><Input id="reason" name="reason" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label htmlFor="printSize">Print size (completed)</Label><select id="printSize" name="printSize" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="">None</option>{PRINT_SIZES.map((size) => <option key={size} value={size}>{size.replaceAll("_", " ")}</option>)}</select></div>
                  <div className="space-y-1"><Label htmlFor="printsUsed">Prints used</Label><Input id="printsUsed" name="printsUsed" type="number" min="0" /></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setStatusOpen(false)}>Close</Button><Button type="submit" disabled={pending}>Save status</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          {role !== "OPERATOR" && <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
            <DialogTrigger render={<Button />}>Record payment</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>Add a live payment to this booking.</DialogDescription></DialogHeader>
              <form onSubmit={(event) => { submitPayment(event); setPaymentOpen(false); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Amount</Label><Input name="amount" type="number" min="1" required /></div><div className="space-y-1"><Label>Paid on</Label><Input name="paidOn" type="date" defaultValue={toISODateStringIST(new Date())} required /></div><div className="space-y-1"><Label>Kind</Label><select name="kind" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">{PAYMENT_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></div><div className="space-y-1"><Label>Mode</Label><select name="mode" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div></div>
                <div className="space-y-1"><Label>Received by</Label><Input name="receivedBy" required /></div><div className="space-y-1"><Label>Reference</Label><Input name="reference" /></div><div className="space-y-1"><Label>Note</Label><Textarea name="note" /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Close</Button><Button type="submit" disabled={pending}>Record</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>}
          {role === "PARTNER" && <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger render={<Button variant="destructive" />}>Cancel booking</DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Cancel booking</DialogTitle><DialogDescription>Cancelled bookings cannot be transitioned again.</DialogDescription></DialogHeader>
              <form onSubmit={(event) => { submitCancel(event); setCancelOpen(false); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Refund amount</Label><Input name="refundAmount" type="number" min="0" defaultValue="0" /></div><div className="space-y-1"><Label>Refund mode</Label><select name="refundMode" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div></div>
                <div className="space-y-1"><Label>Cancellation reason</Label><Textarea name="reason" minLength={3} required /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>Close</Button><Button type="submit" variant="destructive" disabled={pending}>Cancel booking</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Total", booking.totalAmount], ["Received", booking.received], ["Balance", booking.balance], ["Event date", formatDateIST(booking.eventDate)]].map(([label, value]) => <Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{typeof value === "number" ? inr(value) : value}</CardContent></Card>)}
      </section>

      {role === "PARTNER" && "expenses" in booking && (() => {
        const profit = eventProfit(
          { basePrice: booking.basePrice, travelCharge: booking.travelCharge, discount: booking.discount, status: booking.status, printSize: booking.printSize, printsUsed: booking.printsUsed },
          booking.expenses,
          booking.payments
        );
        return (
          <Card>
            <CardHeader><CardTitle>Costs and profit</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[["Billed", profit.revenue], ["Costs", profit.directCosts], ["Profit", profit.profit], ["Margin", profit.margin === null ? "n/a" : `${profit.margin}%`]].map(([label, value]) => <div key={String(label)} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{typeof value === "number" ? inr(value) : value}</p></div>)}
              </div>
              {profit.consumablesEstimate !== null && <p className="text-sm">Consumables estimate: <strong>{inr(profit.consumablesEstimate)}</strong></p>}
              {profit.costsIncomplete && <Badge variant="destructive">Costs incomplete</Badge>}
              <div className="divide-y">
                {booking.expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between py-2">
                    <div><p className="text-sm">{expense.category.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{expense.note || formatDateIST(expense.spentOn)}</p></div>
                    <div className="flex items-center gap-2"><span className={expense.voidedAt ? "line-through" : "font-semibold"}>{inr(expense.amount)}</span>{expense.receiptUrl && <a href={expense.receiptUrl} target="_blank" rel="noreferrer"><img src={expense.receiptUrl} alt="Receipt" className="h-10 w-10 rounded object-cover" /></a>}</div>
                  </div>
                ))}
                {booking.expenses.length === 0 && <p className="py-2 text-sm text-muted-foreground">No linked costs.</p>}
              </div>
              <Link href={`/expenditure?bookingId=${booking.id}`}><Button variant="outline">Add cost</Button></Link>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Editable details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitDetails} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>Client</Label><Input name="clientName" defaultValue={booking.clientName} required /></div><div className="space-y-1"><Label>Phone</Label><Input name="phone" defaultValue={booking.phone} required /></div><div className="space-y-1"><Label>City</Label><Input name="city" defaultValue={booking.city ?? ""} /></div><div className="space-y-1"><Label>Venue</Label><Input name="venue" defaultValue={booking.venue ?? ""} /></div><div className="space-y-1 sm:col-span-2"><Label>Map link</Label><Input name="mapLink" defaultValue={booking.mapLink ?? ""} /></div></div>
              <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1"><Label>Event date</Label><Input name="eventDate" type="date" defaultValue={toISODateStringIST(booking.eventDate)} required /></div><div className="space-y-1"><Label>Start</Label><Input name="startTime" type="time" defaultValue={booking.startTime ?? ""} /></div><div className="space-y-1"><Label>End</Label><Input name="endTime" type="time" defaultValue={booking.endTime ?? ""} /></div></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>Package</Label><select value={packageId} onChange={(event) => { setPackageId(event.target.value); const pkg = packages.find((item) => item.id === event.target.value); if (pkg) { setPackageName(pkg.name); if (pkg.price > 0) setBasePrice(String(pkg.price)); } }} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="">Custom</option>{packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></div><div className="space-y-1"><Label>Package name</Label><Input value={packageName} onChange={(event) => setPackageName(event.target.value)} required /></div></div>
              <div className="grid gap-3 sm:grid-cols-4"><div className="space-y-1"><Label>Base</Label><Input type="number" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} /></div><div className="space-y-1"><Label>Travel</Label><Input type="number" value={travelCharge} onChange={(event) => setTravelCharge(event.target.value)} /></div><div className="space-y-1"><Label>Discount</Label><Input type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div><div className="space-y-1"><Label>Type</Label><select name="type" defaultValue={booking.type} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">{BOOKING_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div></div>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="payOnEvent" defaultChecked={booking.payOnEvent} />Pay on event</label>
              <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>Day contact</Label><Input name="dayContact" defaultValue={booking.dayContact ?? ""} /></div><div className="space-y-1"><Label>Price edit reason (completed bookings)</Label><Input name="priceEditReason" /></div></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea name="notes" defaultValue={booking.notes ?? ""} /></div>
              <Button type="submit" disabled={pending}>Save changes</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment ledger</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {booking.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : booking.payments.map((payment) => (
              <div key={payment.id} className={`rounded-md border p-3 ${payment.voidedAt ? "bg-muted/50 opacity-70" : ""}`}>
                <div className={`flex items-center justify-between ${payment.voidedAt ? "line-through" : ""}`}><span className="font-semibold">{inr(payment.amount)}</span><span className="text-xs text-muted-foreground">{payment.kind} - {payment.mode}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateIST(payment.paidOn)} - {payment.receivedBy || "Unknown"}</p>
                {payment.voidedAt && <p className="mt-1 text-xs text-destructive">Voided: {payment.voidReason || "No reason"} ({payment.voidedBy?.name || "Unknown"})</p>}
                {role === "PARTNER" && !payment.voidedAt && <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
                  <DialogTrigger render={<Button variant="outline" size="xs" className="mt-2" />}>Void</DialogTrigger>
                  <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Void payment</DialogTitle><DialogDescription>This removes the payment from all live calculations.</DialogDescription></DialogHeader><form onSubmit={(event) => { submitVoid(event); setVoidOpen(false); }} className="space-y-3"><input type="hidden" name="paymentId" value={payment.id} /><div className="space-y-1"><Label>Reason</Label><Textarea name="reason" minLength={3} required /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setVoidOpen(false)}>Close</Button><Button type="submit" variant="destructive" disabled={pending}>Void payment</Button></DialogFooter></form></DialogContent>
                </Dialog>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card><CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader><CardContent><div className="divide-y">{booking.activities.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No activity yet.</p> : booking.activities.map((activity) => <div key={activity.id} className="py-3"><p className="text-sm">{activity.message}</p><p className="mt-1 text-xs text-muted-foreground">{activity.user?.name || "System"} - {formatDateTimeIST(activity.createdAt)}</p></div>)}</div></CardContent></Card>
    </div>
  );
}
