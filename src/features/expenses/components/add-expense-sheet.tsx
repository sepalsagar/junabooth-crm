"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CameraIcon, PlusIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toISODateStringIST } from "@/lib/dates";
import { createExpense } from "../actions";
import { attachReceipt, createReceiptUpload } from "../storage";

const CATEGORIES = [
  ["OPERATOR_FEE", "Operator"], ["TRANSPORT", "Transport"], ["FOOD", "Food"],
  ["VENUE_CUT", "Venue"], ["CONSUMABLES", "Consumables"], ["EQUIPMENT", "Equipment"],
  ["SOFTWARE", "Software"], ["CARPENTRY", "Carpentry"], ["EMI", "EMI"],
  ["MARKETING", "Marketing"], ["ADMIN", "Admin"], ["OTHER", "Other"],
] as const;

async function resizeReceipt(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not resize receipt");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not resize receipt")), "image/jpeg", 0.8);
  });
}

export function AddExpenseSheet({
  bookings,
  paidBy,
}: {
  bookings: { id: string; code: string; clientName: string; eventDate: Date }[];
  paidBy: string[];
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number][0]>("TRANSPORT");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createExpense({
        amount: Number(form.get("amount")),
        category,
        spentOn: String(form.get("spentOn")),
        bookingId: String(form.get("bookingId") || "") || undefined,
        paidBy: String(form.get("paidBy") || "") || undefined,
        note: String(form.get("note") || "") || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (receipt) {
        const resized = await resizeReceipt(receipt);
        const type = "image/jpeg";
        const upload = await createReceiptUpload(result.data.id, { type, size: resized.size });
        if (!upload.ok) {
          toast.error(upload.error);
          return;
        }
        const response = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: resized,
        });
        if (!response.ok) {
          toast.error("Receipt upload failed");
          return;
        }
        await attachReceipt(result.data.id, upload.path);
      }
      toast.success(result.warnings?.[0] ? "Expense added with a duplicate warning" : "Expense added");
      setOpen(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <PlusIcon /> Add expense
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto sm:max-w-lg sm:right-0 sm:left-auto">
        <SheetHeader><SheetTitle>Add expense</SheetTitle><SheetDescription>Fast entry for phone use.</SheetDescription></SheetHeader>
        <form onSubmit={submit} className="space-y-4 p-4">
          <div className="space-y-1">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" inputMode="numeric" min="1" required autoFocus className="h-12 text-lg" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(([value, label]) => (
                <Button key={value} type="button" size="sm" variant={category === value ? "default" : "outline"} onClick={() => setCategory(value)}>{label}</Button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Date</Label><Input name="spentOn" type="date" defaultValue={toISODateStringIST(new Date())} required /></div>
            <div className="space-y-1"><Label>Paid by</Label><Input name="paidBy" list="recent-paid-by" /><datalist id="recent-paid-by">{paidBy.map((name) => <option key={name} value={name} />)}</datalist></div>
          </div>
          <div className="space-y-1">
            <Label>Booking (today/tomorrow first)</Label>
            <select name="bookingId" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Unlinked</option>
              {bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.code} - {booking.clientName}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Note</Label><Textarea name="note" /></div>
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed text-sm">
            <CameraIcon className="h-4 w-4" /> {receipt ? receipt.name : "Camera receipt"}
            <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
                toast.error("Receipt must be JPEG, PNG, or WebP and 5 MB or smaller");
                setReceipt(null);
                return;
              }
              setReceipt(file);
            }} />
          </label>
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving..." : "Save expense"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
