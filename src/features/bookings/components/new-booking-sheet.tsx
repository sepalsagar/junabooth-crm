"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PlusIcon } from "lucide-react";
import { createBooking } from "../actions";
import { BOOKING_STATUSES, BOOKING_TYPES, type BookingStatusType, type BookingTypeKind } from "../schema";

export function NewBookingSheet({ packages = [] }: { packages: { id: string; name: string; price: number; hours: number }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [packageId, setPackageId] = useState("");
  const [packageName, setPackageName] = useState("Classic");
  const [basePrice, setBasePrice] = useState("16000");
  const [travelCharge, setTravelCharge] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [status, setStatus] = useState<BookingStatusType>("CONFIRMED");
  const [type, setType] = useState<BookingTypeKind>("PAID");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createBooking({
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
        type,
        status,
        payOnEvent: form.get("payOnEvent") === "on",
        unit: (String(form.get("unit") || "") as "UNIT_1" | "UNIT_2") || null,
        dayContact: String(form.get("dayContact") || "") || undefined,
        notes: String(form.get("notes") || "") || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(`Booking ${result.data.code} created`);
      setOpen(false);
      router.push(`/bookings/${result.data.code}`);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}><PlusIcon />New booking</SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-lg">
        <SheetHeader><SheetTitle>New booking</SheetTitle><SheetDescription>Add a direct booking without a lead.</SheetDescription></SheetHeader>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="clientName">Client *</Label><Input id="clientName" name="clientName" required /></div>
            <div className="space-y-1"><Label htmlFor="phone">Phone *</Label><Input id="phone" name="phone" required /></div>
            <div className="space-y-1"><Label htmlFor="city">City</Label><Input id="city" name="city" /></div>
            <div className="space-y-1"><Label htmlFor="venue">Venue</Label><Input id="venue" name="venue" /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="mapLink">Map link</Label><Input id="mapLink" name="mapLink" /></div>
            <div className="space-y-1"><Label htmlFor="eventDate">Event date *</Label><Input id="eventDate" name="eventDate" type="date" required /></div>
            <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="startTime">Start</Label><Input id="startTime" name="startTime" type="time" /></div><div className="space-y-1"><Label htmlFor="endTime">End</Label><Input id="endTime" name="endTime" type="time" /></div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="package">Package</Label><select id="package" value={packageId} onChange={(event) => { const id = event.target.value; setPackageId(id); const pkg = packages.find((item) => item.id === id); if (pkg) { setPackageName(pkg.name); if (pkg.price > 0) setBasePrice(String(pkg.price)); } }} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="">Custom package</option>{packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} - INR {pkg.price}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="packageName">Package name *</Label><Input id="packageName" value={packageName} onChange={(event) => setPackageName(event.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><Label htmlFor="basePrice">Base</Label><Input id="basePrice" type="number" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} required /></div>
            <div className="space-y-1"><Label htmlFor="travelCharge">Travel</Label><Input id="travelCharge" type="number" value={travelCharge} onChange={(event) => setTravelCharge(event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="discount">Discount</Label><Input id="discount" type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="type">Booking type</Label><select id="type" value={type} onChange={(event) => setType(event.target.value as BookingTypeKind)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">{BOOKING_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="status">Status</Label><select id="status" value={status} onChange={(event) => setStatus(event.target.value as BookingStatusType)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">{BOOKING_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="unit">Booth Unit</Label><select id="unit" name="unit" className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="">No unit assigned</option><option value="UNIT_1">Unit 1</option><option value="UNIT_2">Unit 2</option></select></div>
            <div className="space-y-1"><Label htmlFor="dayContact">Day contact</Label><Input id="dayContact" name="dayContact" /></div>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="payOnEvent" />Pay on event</label>
          <div className="space-y-1"><Label htmlFor="dayContact">Day-of-event contact</Label><Input id="dayContact" name="dayContact" /></div>
          <div className="space-y-1"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create booking"}</Button></div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
