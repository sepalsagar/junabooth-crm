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
import { createLead } from "../actions";
import { LEAD_SOURCES, type LeadSourceType } from "../schema";
import { PlusIcon } from "lucide-react";

interface QuickAddLeadSheetProps {
  facets: {
    cities: string[];
    eventTypes: string[];
  };
}

export function QuickAddLeadSheet({ facets }: QuickAddLeadSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Patna");
  const [eventType, setEventType] = useState("Wedding");
  const [targetDate, setTargetDate] = useState("");
  const [source, setSource] = useState<LeadSourceType>("INSTAGRAM");
  const [quotedAmount, setQuotedAmount] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const resetForm = () => {
    setClientName("");
    setPhone("");
    setCity("Patna");
    setEventType("Wedding");
    setTargetDate("");
    setSource("INSTAGRAM");
    setQuotedAmount("");
    setNextFollowUp("");
    setNotes("");
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    startTransition(async () => {
      const res = await createLead({
        clientName,
        phone,
        city: city || undefined,
        eventType: eventType || undefined,
        targetDate: targetDate || undefined,
        source: source || undefined,
        quotedAmount: quotedAmount ? Number(quotedAmount) : undefined,
        nextFollowUp: nextFollowUp || undefined,
        notes: notes || undefined,
      });

      if (!res.ok) {
        if (res.errors) {
          setErrors(res.errors);
        }
        toast.error(res.error || "Failed to create lead");
        return;
      }

      toast.success(`Lead ${res.data.code} created successfully!`, {
        description: res.duplicateWarning,
      });

      resetForm();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="gap-1.5" />}>
        <PlusIcon className="h-4 w-4" />
        <span>Quick Add Lead</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto p-6"
      >
        <SheetHeader>
          <SheetTitle>Quick Add Lead</SheetTitle>
          <SheetDescription>
            Add a new lead in under 15 seconds. All details can be edited later.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          {/* Client Name (Required) */}
          <div className="space-y-1">
            <Label htmlFor="clientName" className="text-xs font-medium">
              Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientName"
              placeholder="e.g. Aarav Mehta"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              autoFocus
              className={errors.clientName ? "border-destructive" : ""}
            />
            {errors.clientName && (
              <p className="text-[11px] text-destructive">
                {errors.clientName[0]}
              </p>
            )}
          </div>

          {/* Phone (Required) */}
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs font-medium">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="10-digit mobile (e.g. 9876543210)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-[11px] text-destructive">{errors.phone[0]}</p>
            )}
          </div>

          {/* City & Event Type (2 cols) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs font-medium">
                City
              </Label>
              <Input
                id="city"
                placeholder="Patna, Delhi NCR..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                list="city-suggestions"
              />
              <datalist id="city-suggestions">
                {facets.cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <Label htmlFor="eventType" className="text-xs font-medium">
                Event Type
              </Label>
              <Input
                id="eventType"
                placeholder="Wedding, Birthday..."
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                list="event-suggestions"
              />
              <datalist id="event-suggestions">
                {facets.eventTypes.map((et) => (
                  <option key={et} value={et} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Source & Target Date (2 cols) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="source" className="text-xs font-medium">
                Source
              </Label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSourceType)}
                className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="targetDate" className="text-xs font-medium">
                Target Date
              </Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Quoted Amount & Next Follow-up (2 cols) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="quotedAmount" className="text-xs font-medium">
                Quoted Amount (₹)
              </Label>
              <Input
                id="quotedAmount"
                type="number"
                placeholder="20000"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="nextFollowUp" className="text-xs font-medium">
                Next Follow-Up
              </Label>
              <Input
                id="nextFollowUp"
                type="date"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Package inquiry, client preferences, budget notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16 text-xs"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
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
              {isPending ? "Creating..." : "Save Lead"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
