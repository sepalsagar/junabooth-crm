"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { inr } from "@/lib/format";
import { formatDateIST } from "@/lib/dates";
import { voidCapitalEntry } from "../actions";
import type { CapitalEntryItem } from "../queries";
import { ArrowDownLeftIcon, ArrowUpRightIcon, BanIcon } from "lucide-react";

interface CapitalEntriesListProps {
  entries: CapitalEntryItem[];
}

export function CapitalEntriesList({ entries }: CapitalEntriesListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedEntry, setSelectedEntry] = useState<CapitalEntryItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    startTransition(async () => {
      const res = await voidCapitalEntry({
        entryId: selectedEntry.id,
        reason: voidReason,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to void entry.");
        return;
      }

      toast.success("Capital entry voided successfully.");
      setDialogOpen(false);
      setSelectedEntry(null);
      setVoidReason("");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Capital Ledger</CardTitle>
        <CardDescription className="text-xs">
          Chronological record of partner injections and withdrawals (voided entries struck through)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No capital entries recorded yet.
          </p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {entries.map((entry) => {
              const isVoided = Boolean(entry.voidedAt);

              return (
                <div
                  key={entry.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-colors ${
                    isVoided ? "bg-muted/30 opacity-70" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {entry.kind === "INJECTED" ? (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                        >
                          <ArrowDownLeftIcon className="h-3 w-3" />
                          <span>Injection</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/5"
                        >
                          <ArrowUpRightIcon className="h-3 w-3" />
                          <span>Withdrawal</span>
                        </Badge>
                      )}

                      <span className={`font-semibold ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                        {entry.partnerName}
                      </span>

                      {isVoided && (
                        <Badge variant="destructive" className="text-[10px] py-0">
                          Voided
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{formatDateIST(entry.date)}</span>
                      {entry.mode && <span>• {entry.mode}</span>}
                      {entry.note && <span>• {entry.note}</span>}
                    </div>

                    {isVoided && (
                      <p className="text-xs text-destructive mt-1">
                        Void reason: {entry.voidReason}
                        {entry.voidedByName && ` (${entry.voidedByName})`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isVoided
                            ? "line-through text-muted-foreground"
                            : entry.kind === "INJECTED"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {entry.kind === "INJECTED" ? "+" : "-"} {inr(entry.amount)}
                      </span>
                    </div>

                    {!isVoided && (
                      <Dialog
                        open={dialogOpen && selectedEntry?.id === entry.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setSelectedEntry(entry);
                            setVoidReason("");
                          } else {
                            setSelectedEntry(null);
                          }
                          setDialogOpen(open);
                        }}
                      >
                        <DialogTrigger render={<Button variant="ghost" size="xs" className="h-7 text-xs text-muted-foreground hover:text-destructive" />}>
                          <BanIcon className="h-3 w-3 mr-1" />
                          <span>Void</span>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Void Capital Entry</DialogTitle>
                            <DialogDescription>
                              This entry of {inr(entry.amount)} for {entry.partnerName} will be voided and excluded from all cash and capital calculations. Entries are never deleted.
                            </DialogDescription>
                          </DialogHeader>

                          <form onSubmit={handleVoid} className="space-y-4">
                            <div className="space-y-1">
                              <Label htmlFor="reason" className="text-xs">Reason for voiding *</Label>
                              <Input
                                id="reason"
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder="e.g. Duplicate entry or entered wrong partner"
                                className="text-xs"
                                required
                                minLength={3}
                              />
                            </div>

                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                variant="destructive"
                                size="sm"
                                disabled={pending || voidReason.trim().length < 3}
                              >
                                {pending ? "Voiding..." : "Confirm Void"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
