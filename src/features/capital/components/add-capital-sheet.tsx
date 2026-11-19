"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toISODateStringIST } from "@/lib/dates";
import { PlusIcon, AlertTriangleIcon } from "lucide-react";
import { addCapitalEntry } from "../actions";
import { PAYMENT_MODES, type CapitalKindType, type PaymentModeType } from "../schema";

interface AddCapitalSheetProps {
  partners: Array<{ id: string; name: string }>;
}

export function AddCapitalSheet({ partners }: AddCapitalSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [partnerId, setPartnerId] = useState(partners[0]?.id || "");
  const [kind, setKind] = useState<CapitalKindType>("INJECTED");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toISODateStringIST(new Date()));
  const [mode, setMode] = useState<PaymentModeType>("BANK");
  const [note, setNote] = useState("");

  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [confirmBelowZero, setConfirmBelowZero] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setPartnerId(partners[0]?.id || "");
    setKind("INJECTED");
    setAmount("");
    setDate(toISODateStringIST(new Date()));
    setMode("BANK");
    setNote("");
    setWarningMessage(null);
    setConfirmBelowZero(false);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Please enter an amount greater than zero.");
      return;
    }

    startTransition(async () => {
      const res = await addCapitalEntry({
        partnerId,
        kind,
        amount: numAmount,
        date,
        mode,
        note: note || undefined,
        confirmBelowZero,
      });

      if (!res.ok) {
        if (res.warning === "WITHDRAWAL_BELOW_ZERO") {
          setWarningMessage(res.error);
        } else {
          setErrorMessage(res.error || "Failed to record capital entry.");
          toast.error(res.error || "Failed to record capital entry.");
        }
        return;
      }

      toast.success(
        kind === "INJECTED"
          ? `Capital injection of ₹${numAmount.toLocaleString("en-IN")} recorded`
          : `Capital withdrawal of ₹${numAmount.toLocaleString("en-IN")} recorded`
      );
      resetForm();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="gap-1.5 h-9" />}>
        <PlusIcon className="h-4 w-4" />
        <span>Add Capital Entry</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Record Partner Capital</SheetTitle>
          <SheetDescription>
            Record an equity injection or partner withdrawal.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {errorMessage && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
              {errorMessage}
            </div>
          )}

          {warningMessage && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-400 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Negative Cash Warning</span>
              </div>
              <p>{warningMessage}</p>
              <label className="flex items-start gap-2 pt-1 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmBelowZero}
                  onChange={(e) => setConfirmBelowZero(e.target.checked)}
                  className="mt-0.5 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                />
                <span>Confirm withdrawal despite pushing cash position below zero</span>
              </label>
            </div>
          )}

          {/* Partner Selector */}
          <div className="space-y-1">
            <Label htmlFor="partnerId" className="text-xs">Partner *</Label>
            <select
              id="partnerId"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              required
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kind Selector */}
          <div className="space-y-1">
            <Label htmlFor="kind" className="text-xs">Entry Type *</Label>
            <select
              id="kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as CapitalKindType);
                setWarningMessage(null);
                setConfirmBelowZero(false);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              required
            >
              <option value="INJECTED">Capital Injected (Equity addition)</option>
              <option value="WITHDRAWN">Capital Withdrawn (Partner payout)</option>
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="amount" className="text-xs">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setWarningMessage(null);
              }}
              placeholder="e.g. 50000"
              className="h-9 text-xs font-mono"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs">Date (IST) *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Mode */}
          <div className="space-y-1">
            <Label htmlFor="mode" className="text-xs">Payment Mode</Label>
            <select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as PaymentModeType)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label htmlFor="note" className="text-xs">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Initial capital contribution"
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending || (Boolean(warningMessage) && !confirmBelowZero)}
            >
              {pending ? "Saving..." : "Record Entry"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
