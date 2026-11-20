"use client";

import Link from "next/link";
import { inr } from "@/lib/format";
import { formatDateIST, startOfTodayIST } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { telLink, whatsappLink } from "../phone";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockAlertIcon,
  MapPinIcon,
  PhoneIcon,
  CheckCircle2Icon,
} from "lucide-react";
import type { LeadSourceType, LeadStatusType } from "../schema";

export interface LeadListItem {
  id: string;
  code: string;
  clientName: string;
  phone: string;
  whatsapp?: string | null;
  city?: string | null;
  eventType?: string | null;
  targetDate?: Date | null;
  source?: LeadSourceType | null;
  sourceText?: string | null;
  inquiryDate?: Date | null;
  venue?: string | null;
  notes?: string | null;
  quotedAmount?: number | null;
  status: LeadStatusType | string;
  nextFollowUp?: Date | null;
  createdAt: Date;
  booking?: {
    code: string;
  } | null;
  owner?: {
    id: string;
    name: string;
  } | null;
}

interface LeadsTableProps {
  leads: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentPath: string;
  searchParams: Record<string, string | string[] | undefined>;
}

export function LeadsTable({
  leads,
  total,
  page,
  pageSize,
  totalPages,
  currentPath,
  searchParams,
}: LeadsTableProps) {
  const startToday = startOfTodayIST(new Date());

  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key !== "page" && value)
        params.set(key, Array.isArray(value) ? value.join(",") : value);
    }
    params.set("page", String(targetPage));
    return `${currentPath}?${params.toString()}`;
  };

  if (!leads.length)
    return (
      <Card className="my-6 py-12 text-center">
        <CardContent className="space-y-3">
          <p className="text-lg font-medium text-muted-foreground">No leads found</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Try adjusting or clearing your search filters to find what you are looking for.
          </p>
          <Link href={currentPath}>
            <Button variant="outline" size="sm">Clear filters</Button>
          </Link>
        </CardContent>
      </Card>
    );

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  const overdue = (lead: LeadListItem) =>
    Boolean(
      lead.nextFollowUp &&
        new Date(lead.nextFollowUp) < startToday &&
        lead.status !== "WON" &&
        lead.status !== "LOST"
    );

  return (
    <div className="space-y-4">
      {/* Desktop Table matching Spreadsheet Columns */}
      <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-xs md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[100px] font-bold">Lead ID</TableHead>
              <TableHead className="font-bold">Inquiry Date</TableHead>
              <TableHead className="font-bold">Client Name</TableHead>
              <TableHead className="font-bold">Region</TableHead>
              <TableHead className="font-bold">Event Type</TableHead>
              <TableHead className="font-bold">Target Date</TableHead>
              <TableHead className="font-bold">Source</TableHead>
              <TableHead className="text-right font-bold">Budget (₹)</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Linked Booking</TableHead>
              <TableHead className="font-bold">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const isOverdue = overdue(lead);
              const sourceDisplay = lead.sourceText || lead.source || null;

              return (
                <TableRow key={lead.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs font-bold">
                    <Link
                      href={`/leads/${lead.code}`}
                      className="text-primary hover:underline"
                    >
                      {lead.code}
                    </Link>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {lead.inquiryDate ? formatDateIST(lead.inquiryDate) : "—"}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium text-xs">
                      <Link href={`/leads/${lead.code}`} className="hover:underline">
                        {lead.clientName}
                      </Link>
                    </div>
                    {lead.phone && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <a href={telLink(lead.phone)} className="hover:underline">
                          {lead.phone}
                        </a>
                        <a
                          href={whatsappLink(lead.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          WA
                        </a>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-xs font-medium">
                    {lead.city || "—"}
                  </TableCell>

                  <TableCell className="text-xs">
                    {lead.eventType || "—"}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-xs">
                    {lead.targetDate ? formatDateIST(lead.targetDate) : "—"}
                  </TableCell>

                  <TableCell className="text-xs">
                    {sourceDisplay ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                        {sourceDisplay}
                      </span>
                    ) : "—"}
                  </TableCell>

                  <TableCell className="text-right text-xs font-semibold">
                    {lead.quotedAmount !== null && lead.quotedAmount !== undefined
                      ? inr(lead.quotedAmount)
                      : "—"}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>

                  <TableCell className="text-xs font-mono font-semibold">
                    {lead.booking?.code ? (
                      <Link
                        href={`/bookings/${lead.booking.code}`}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                      >
                        <CheckCircle2Icon className="h-3.5 w-3.5" />
                        {lead.booking.code}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                    <span className="line-clamp-2" title={lead.notes || ""}>
                      {lead.notes || "—"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {leads.map((lead) => {
          const isOverdue = overdue(lead);
          const sourceDisplay = lead.sourceText || lead.source || null;

          return (
            <Card key={lead.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/leads/${lead.code}`}
                      className="font-mono text-xs font-bold text-primary underline"
                    >
                      {lead.code}
                    </Link>
                    {lead.booking?.code && (
                      <Link
                        href={`/bookings/${lead.booking.code}`}
                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700"
                      >
                        <CheckCircle2Icon className="h-3 w-3" />
                        {lead.booking.code}
                      </Link>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">
                    <Link href={`/leads/${lead.code}`}>{lead.clientName}</Link>
                  </h3>
                  {lead.city && (
                    <p className="text-xs text-muted-foreground">{lead.city}</p>
                  )}
                </div>
                <StatusBadge status={lead.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 border-t pt-2 text-xs">
                {lead.inquiryDate && (
                  <div>
                    <span className="text-muted-foreground">Inquiry: </span>
                    <span>{formatDateIST(lead.inquiryDate)}</span>
                  </div>
                )}
                {lead.eventType && (
                  <div>
                    <span className="text-muted-foreground">Event: </span>
                    <span>{lead.eventType}</span>
                  </div>
                )}
                {lead.targetDate && (
                  <div>
                    <span className="text-muted-foreground">Target: </span>
                    <span>{formatDateIST(lead.targetDate)}</span>
                  </div>
                )}
                {lead.quotedAmount !== null && lead.quotedAmount !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Budget: </span>
                    <span className="font-semibold">{inr(lead.quotedAmount)}</span>
                  </div>
                )}
                {sourceDisplay && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Source: </span>
                    <span className="font-medium">{sourceDisplay}</span>
                  </div>
                )}
                {lead.notes && (
                  <div className="col-span-2 text-muted-foreground">
                    <span>Note: </span>
                    <span>{lead.notes}</span>
                  </div>
                )}
              </div>

              {lead.phone && (
                <div className="flex items-center justify-between border-t pt-2">
                  <div className="flex gap-2">
                    <a href={telLink(lead.phone)}>
                      <Button size="xs" variant="outline" className="gap-1">
                        <PhoneIcon className="h-3.5 w-3.5" /> Call
                      </Button>
                    </a>
                    <a href={whatsappLink(lead.phone)} target="_blank" rel="noreferrer">
                      <Button size="xs" className="bg-emerald-600 text-white hover:bg-emerald-700">WA</Button>
                    </a>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 pt-2 text-sm text-muted-foreground sm:flex-row">
        <div>
          Showing <span className="font-medium text-foreground">{startRecord}</span>
          –<span className="font-medium text-foreground">{endRecord}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> leads
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={page > 1 ? getPageUrl(page - 1) : "#"}
            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            <Button variant="outline" size="sm" disabled={page <= 1}>
              <ChevronLeftIcon /> Previous
            </Button>
          </Link>
          <span className="px-3 text-xs font-medium">Page {page} of {totalPages}</span>
          <Link
            href={page < totalPages ? getPageUrl(page + 1) : "#"}
            className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
          >
            <Button variant="outline" size="sm" disabled={page >= totalPages}>
              Next <ChevronRightIcon />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
