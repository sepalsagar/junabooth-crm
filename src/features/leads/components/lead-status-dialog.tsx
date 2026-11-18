"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { changeStatus } from "../actions";
import {
  LEAD_STATUSES,
  LOST_REASONS,
  type LeadStatusType,
  type LostReasonType,
} from "../schema";
import { toISODateStringIST } from "@/lib/dates";

interface LeadStatusDialogProps {
  leadId: string;
  currentStatus: LeadStatusType | string;
  currentFollowUp?: Date | null;
  currentLostReason?: string | null;
}

export function LeadStatusDialog({
  leadId,
  currentStatus,
  currentFollowUp,
  currentLostReason,
}: LeadStatusDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<LeadStatusType>(
    (currentStatus as LeadStatusType) ?? "NEW"
  );
  const [nextFollowUp, setNextFollowUp] = useState<string>(
    currentFollowUp ? toISODateStringIST(new Date(currentFollowUp)) : ""
  );
  const [lostReason, setLostReason] = useState<LostReasonType>(
    (currentLostReason as LostReasonType) ?? "Budget"
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isFollowUpRequired = [
    "CONTACTED",
    "QUOTED",
    "FOLLOW_UP",
    "POSTPONED",
  ].includes(status);
  const isLost = status === "LOST";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side quick check
    if (status === "WON") {
      setFormError("Convert to a booking (Phase 4)");
      return;
    }

    if (isFollowUpRequired && !nextFollowUp) {
      setFormError(`Next follow-up date is required for ${status}`);
      return;
    }

    startTransition(async () => {
      const res = await changeStatus({
        leadId,
        status,
        nextFollowUp: nextFollowUp ? nextFollowUp : null,
        lostReason: isLost ? lostReason : null,
      });

      if (!res.ok) {
        setFormError(res.error || "Failed to update status");
        toast.error(res.error || "Failed to update status");
        return;
      }

      toast.success(`Status updated to ${res.data.status}`);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Change Status
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Lead Status</DialogTitle>
          <DialogDescription>
            Change status according to customer engagement pipeline rules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {formError && (
            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
              {formError}
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">New Status</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {LEAD_STATUSES.map((s) => {
                const isWon = s === "WON";
                const isSelected = status === s;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isWon}
                    onClick={() => {
                      setStatus(s);
                      setFormError(null);
                    }}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left text-xs transition-colors ${
                      isWon
                        ? "opacity-50 cursor-not-allowed bg-muted/40 border-muted"
                        : isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-input bg-card hover:bg-muted"
                    }`}
                  >
                    <span>{s}</span>
                    {isWon && (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Convert to booking (Phase 4)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follow-up date (if required) */}
          {isFollowUpRequired && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border">
              <Label htmlFor="nextFollowUpInput" className="text-xs font-medium">
                Next Follow-Up Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nextFollowUpInput"
                type="date"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                required
                className="bg-card"
              />
              <p className="text-[11px] text-muted-foreground">
                Required for active pipeline statuses (must not be in the past).
              </p>
            </div>
          )}

          {/* Lost reason (if LOST) */}
          {isLost && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border">
              <Label htmlFor="lostReasonSelect" className="text-xs font-medium">
                Reason for Lost <span className="text-destructive">*</span>
              </Label>
              <select
                id="lostReasonSelect"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value as LostReasonType)}
                className="w-full h-8 rounded-lg border border-input bg-card px-2 text-xs"
                required
              >
                {LOST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              {isPending ? "Updating..." : "Save Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
