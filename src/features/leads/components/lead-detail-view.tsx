"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { LeadStatusDialog } from "./lead-status-dialog";
import { ConvertLeadSheet } from "@/features/bookings/components/convert-lead-sheet";
import { addNote, deleteLead, updateLead } from "../actions";
import { telLink, whatsappLink } from "../phone";
import { formatDateIST, formatDateTimeIST, toISODateStringIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  PhoneIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LEAD_SOURCES, type LeadSourceType, type LeadStatusType } from "../schema";

interface LeadDetailProps {
  lead: {
    id: string;
    code: string;
    clientName: string;
    phone: string;
    whatsapp?: string | null;
    city?: string | null;
    eventType?: string | null;
    targetDate?: Date | null;
    venue?: string | null;
    source?: LeadSourceType | null;
    quotedAmount?: number | null;
    packageName?: string | null;
    status: LeadStatusType | string;
    nextFollowUp?: Date | null;
    lostReason?: string | null;
    notes?: string | null;
    ownerId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    owner?: {
      id: string;
      name: string;
      email: string;
      role: string;
    } | null;
    booking?: {
      id: string;
      code: string;
      status: string;
    } | null;
    activities: {
      id: string;
      type: string;
      message: string;
      createdAt: Date;
      user?: {
        id: string;
        name: string;
        role: string;
      } | null;
    }[];
  };
  users: { id: string; name: string; role: string }[];
  packages?: { id: string; name: string; price: number; hours: number }[];
}

export function LeadDetailView({ lead, users, packages = [] }: LeadDetailProps) {
  const router = useRouter();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isAddingNote, startNoteTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Editable details form state
  const [clientName, setClientName] = useState(lead.clientName);
  const [phone, setPhone] = useState(lead.phone);
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp ?? "");
  const [city, setCity] = useState(lead.city ?? "");
  const [eventType, setEventType] = useState(lead.eventType ?? "");
  const [targetDate, setTargetDate] = useState(
    lead.targetDate ? toISODateStringIST(new Date(lead.targetDate)) : ""
  );
  const [venue, setVenue] = useState(lead.venue ?? "");
  const [source, setSource] = useState<string>(lead.source ?? "");
  const [quotedAmount, setQuotedAmount] = useState(
    lead.quotedAmount !== null && lead.quotedAmount !== undefined
      ? String(lead.quotedAmount)
      : ""
  );
  const [packageName, setPackageName] = useState(lead.packageName ?? "");
  const [ownerId, setOwnerId] = useState(lead.ownerId ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");

  // Note form state
  const [newNote, setNewNote] = useState("");

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteLead(lead.id);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete lead");
        return;
      }
      toast.success("Lead deleted successfully");
      setDeleteOpen(false);
      router.push("/leads");
    });
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    startUpdateTransition(async () => {
      const res = await updateLead({
        id: lead.id,
        clientName,
        phone,
        whatsapp: whatsapp || undefined,
        city: city || undefined,
        eventType: eventType || undefined,
        targetDate: targetDate || undefined,
        venue: venue || undefined,
        source: (source as LeadSourceType) || undefined,
        quotedAmount: quotedAmount ? Number(quotedAmount) : undefined,
        packageName: packageName || undefined,
        ownerId: ownerId || undefined,
        notes: notes || undefined,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to update lead details");
        return;
      }

      toast.success("Lead details updated successfully", {
        description: res.duplicateWarning,
      });
      router.refresh();
    });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    startNoteTransition(async () => {
      const res = await addNote({
        leadId: lead.id,
        message: newNote.trim(),
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to add note");
        return;
      }

      toast.success("Note added");
      setNewNote("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Link & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-muted-foreground">
                {lead.code}
              </span>
              <StatusBadge status={lead.status} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {lead.clientName}
            </h1>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {lead.phone && (
            <a
              href={whatsappLink(lead.phone)}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <MessageSquareIcon className="h-4 w-4" />
                <span>WhatsApp</span>
              </Button>
            </a>
          )}
          {lead.phone && (
            <a href={telLink(lead.phone)}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <PhoneIcon className="h-4 w-4" />
                <span>Call ({lead.phone})</span>
              </Button>
            </a>
          )}
          <LeadStatusDialog
            leadId={lead.id}
            currentStatus={lead.status}
            currentFollowUp={lead.nextFollowUp}
            currentLostReason={lead.lostReason}
          />
          {!lead.booking && lead.status !== "WON" && (
            <ConvertLeadSheet lead={lead} packages={packages} />
          )}

          {/* Delete Lead Button */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                />
              }
            >
              <Trash2Icon className="h-4 w-4" />
              <span>Delete</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Lead</DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete lead{" "}
                  <strong className="text-foreground">{lead.code}</strong> (
                  {lead.clientName})? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting…" : "Delete Lead"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid: Details on Left, Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editable Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                Lead Details
              </CardTitle>
              {lead.booking && (
                <Badge variant="secondary" className="font-mono">
                  Linked to Booking: {lead.booking.code}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="clientName" className="text-xs">
                      Client Name
                    </Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="whatsapp" className="text-xs">
                      WhatsApp Number
                    </Label>
                    <Input
                      id="whatsapp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ownerSelect" className="text-xs">
                      Assigned Owner
                    </Label>
                    <select
                      id="ownerSelect"
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="city" className="text-xs">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="eventType" className="text-xs">
                      Event Type
                    </Label>
                    <Input
                      id="eventType"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="targetDate" className="text-xs">
                      Target Event Date
                    </Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="venue" className="text-xs">
                      Venue
                    </Label>
                    <Input
                      id="venue"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="source" className="text-xs">
                      Lead Source
                    </Label>
                    <select
                      id="source"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Select source</option>
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="quotedAmount" className="text-xs">
                      Quoted Amount (₹)
                    </Label>
                    <Input
                      id="quotedAmount"
                      type="number"
                      value={quotedAmount}
                      onChange={(e) => setQuotedAmount(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="packageName" className="text-xs">
                      Package Name
                    </Label>
                    <Input
                      id="packageName"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="notes" className="text-xs">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-20 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline & Notes */}
        <div className="space-y-6">
          {/* Quick Summary Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Engagement Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Current Status:</span>
                <StatusBadge status={lead.status} />
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Next Follow-Up:</span>
                <span className="font-medium text-foreground">
                  {lead.nextFollowUp
                    ? formatDateIST(lead.nextFollowUp)
                    : "Not set"}
                </span>
              </div>
              {lead.lostReason && (
                <div className="flex justify-between py-1 border-b text-destructive">
                  <span>Lost Reason:</span>
                  <span className="font-semibold">{lead.lostReason}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Quoted:</span>
                <span className="font-semibold">
                  {lead.quotedAmount !== null && lead.quotedAmount !== undefined
                    ? inr(lead.quotedAmount)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDateIST(lead.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Activity & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <Textarea
                  placeholder="Add a new update or note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="h-16 text-xs bg-background"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="xs"
                    disabled={isAddingNote || !newNote.trim()}
                    className="gap-1 h-7 text-xs"
                  >
                    <SendIcon className="h-3 w-3" />
                    <span>{isAddingNote ? "Posting..." : "Post Note"}</span>
                  </Button>
                </div>
              </form>

              {/* Timeline Items */}
              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted-foreground/20">
                {lead.activities.map((act) => (
                  <div key={act.id} className="relative text-xs space-y-1">
                    <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground">
                        {act.user?.name ?? "System"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTimeIST(act.createdAt)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      {act.type}
                    </Badge>
                    <p className="text-muted-foreground leading-relaxed pt-0.5 whitespace-pre-wrap">
                      {act.message}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
