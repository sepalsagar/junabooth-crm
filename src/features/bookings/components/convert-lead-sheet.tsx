"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { convertLeadToBooking } from "../actions";
import { BOOKING_TYPES, PAYMENT_MODES, type BookingTypeKind, type PaymentModeType } from "../schema";
import { toISODateStringIST } from "@/lib/dates";
import { AwardIcon } from "lucide-react";

interface ConvertLeadSheetProps {
  lead: {
    id: string;
    code: string;
    clientName: string;
    phone: string;
    city?: string | null;
    venue?: string | null;
    targetDate?: Date | null;
    quotedAmount?: number | null;
    packageName?: string | null;
    notes?: string | null;
  };
  packages?: { id: string; name: string; price: number; hours: number }[];
  trigger?: React.ReactNode;
}

export function ConvertLeadSheet({ lead, packages = [], trigger }: ConvertLeadSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [eventDate, setEventDate] = useState(
    lead.targetDate ? toISODateStringIST(new Date(lead.targetDate)) : ""
  );
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("22:00");
  const [packageId, setPackageId] = useState("");
  const [packageName, setPackageName] = useState(lead.packageName || "Classic");
  const [basePrice, setBasePrice] = useState(
    lead.quotedAmount ? String(lead.quotedAmount) : "16000"
  );
  const [travelCharge, setTravelCharge] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [type, setType] = useState<BookingTypeKind>("PAID");
  const [payOnEvent, setPayOnEvent] = useState(false);
  const [unit, setUnit] = useState<"UNIT_1" | "UNIT_2" | "">("");
  const [city, setCity] = useState(lead.city || "");
  const [venue, setVenue] = useState(lead.venue || "");
  const [notes, setNotes] = useState(lead.notes || "");

  // Optional advance payment
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceMode, setAdvanceMode] = useState<PaymentModeType>("UPI");
  const [advanceReceivedBy, setAdvanceReceivedBy] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pkgId = e.target.value;
    setPackageId(pkgId);
    const selected = packages.find((p) => p.id === pkgId);
    if (selected) {
      setPackageName(selected.name);
      if (selected.price > 0) {
        setBasePrice(String(selected.price));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!eventDate) {
      setErrorMsg("Please select an event date");
      return;
    }

    startTransition(async () => {
      const res = await convertLeadToBooking({
        leadId: lead.id,
        eventDate,
        startTime,
        endTime,
        packageId: packageId || undefined,
        packageName,
        basePrice: Number(basePrice) || 0,
        travelCharge: Number(travelCharge) || 0,
        discount: Number(discount) || 0,
        type,
        payOnEvent,
        unit: unit ? unit : null,
        city: city || undefined,
        venue: venue || undefined,
        notes: notes || undefined,
        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
        advanceMode: advanceAmount ? advanceMode : undefined,
        advanceReceivedBy: advanceAmount ? advanceReceivedBy : undefined,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Failed to convert lead");
        toast.error(res.error || "Failed to convert lead");
        return;
      }

      toast.success(`Booking ${res.data.code} created! Lead marked as WON.`);
      setOpen(false);
      router.push(`/bookings/${res.data.code}`);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger ? <>{trigger}</> : <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" />}>
        {!trigger && (
          <>
            <AwardIcon className="h-4 w-4" />
            <span>Convert to Booking</span>
          </>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Convert Lead to Booking</SheetTitle>
          <SheetDescription>
            Creates an official booking for {lead.clientName} ({lead.code}) and marks the lead as WON.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {errorMsg && (
            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
              {errorMsg}
            </div>
          )}

          {/* Event Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="eventDate" className="text-xs font-medium">
                Event Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startTime" className="text-xs font-medium">
                Start Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endTime" className="text-xs font-medium">
                End Time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Package and Type */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="pkgSelect" className="text-xs font-medium">
                Package
              </Label>
              <select
                id="pkgSelect"
                value={packageId}
                onChange={handlePackageChange}
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
              >
                <option value="">Select a package...</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.hours > 0 ? `${pkg.hours}h` : "Custom"} - ₹{pkg.price.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bookingType" className="text-xs font-medium">
                Booking Type
              </Label>
              <select
                id="bookingType"
                value={type}
                onChange={(e) => setType(e.target.value as BookingTypeKind)}
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
              >
                {BOOKING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit" className="text-xs font-medium">
                Booth Unit
              </Label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as "UNIT_1" | "UNIT_2" | "")}
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
              >
                <option value="">No unit assigned</option>
                <option value="UNIT_1">Unit 1</option>
                <option value="UNIT_2">Unit 2</option>
              </select>
            </div>
          </div>

          {/* Pricing Build-up */}
          <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
            <span className="text-xs font-semibold block text-foreground">
              Price Build-up (₹)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="basePrice" className="text-[11px] text-muted-foreground">
                  Base Price
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="bg-card h-8 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="travelCharge" className="text-[11px] text-muted-foreground">
                  Travel Charge
                </Label>
                <Input
                  id="travelCharge"
                  type="number"
                  value={travelCharge}
                  onChange={(e) => setTravelCharge(e.target.value)}
                  className="bg-card h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="discount" className="text-[11px] text-muted-foreground">
                  Discount
                </Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="bg-card h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 text-xs font-bold text-foreground border-t">
              <span>Net Booking Total:</span>
              <span className="text-primary text-sm">
                ₹{(
                  (Number(basePrice) || 0) +
                  (Number(travelCharge) || 0) -
                  (Number(discount) || 0)
                ).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Pay on Event Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="payOnEvent"
              checked={payOnEvent}
              onChange={(e) => setPayOnEvent(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="payOnEvent" className="text-xs font-medium cursor-pointer">
              Pay on Event (Client will pay the full balance on the event date)
            </Label>
          </div>

          {/* City and Venue */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="bookingCity" className="text-xs font-medium">
                City
              </Label>
              <Input
                id="bookingCity"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bookingVenue" className="text-xs font-medium">
                Venue
              </Label>
              <Input
                id="bookingVenue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
          </div>

          {/* Optional Immediate Advance Payment */}
          <div className="p-3 rounded-lg border bg-card space-y-2.5">
            <span className="text-xs font-semibold block text-foreground">
              Record Advance Payment (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="advanceAmount" className="text-[11px]">
                  Amount (₹)
                </Label>
                <Input
                  id="advanceAmount"
                  type="number"
                  placeholder="e.g. 5000"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="advanceMode" className="text-[11px]">
                  Payment Mode
                </Label>
                <select
                  id="advanceMode"
                  value={advanceMode}
                  onChange={(e) => setAdvanceMode(e.target.value as PaymentModeType)}
                  className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="advanceReceivedBy" className="text-[11px]">
                  Received By
                </Label>
                <Input
                  id="advanceReceivedBy"
                  placeholder="Partner name"
                  value={advanceReceivedBy}
                  onChange={(e) => setAdvanceReceivedBy(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="bookingNotes" className="text-xs font-medium">
              Notes
            </Label>
            <Textarea
              id="bookingNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Converting..." : "Confirm Booking"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
