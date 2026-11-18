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
  quotedAmount?: number | null;
  status: LeadStatusType | string;
  nextFollowUp?: Date | null;
  createdAt: Date;
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
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page" || !v) continue;
      if (Array.isArray(v)) {
        params.set(k, v.join(","));
      } else {
        params.set(k, v);
      }
    }
    params.set("page", String(targetPage));
    return `${currentPath}?${params.toString()}`;
  };

  if (leads.length === 0) {
    return (
      <Card className="my-6 text-center py-12">
        <CardContent className="space-y-3">
          <p className="text-lg font-medium text-muted-foreground">
            No leads found
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Try adjusting or clearing your search filters to find what you are
            looking for.
          </p>
          <div>
            <Link href={currentPath}>
              <Button variant="outline" size="sm">
                Clear filters
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Desktop / Tablet Table View (md+) */}
      <div className="hidden md:block rounded-lg border bg-card shadow-xs overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Target Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Quoted (INR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Follow-Up</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const isOverdue =
                lead.nextFollowUp &&
                new Date(lead.nextFollowUp) < startToday &&
                lead.status !== "WON" &&
                lead.status !== "LOST";

              return (
                <TableRow key={lead.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-semibold">
                    <Link
                      href={`/leads/${lead.code}`}
                      className="text-primary underline hover:text-primary/80"
                    >
                      {lead.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      <Link
                        href={`/leads/${lead.code}`}
                        className="hover:underline"
                      >
                        {lead.clientName}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <a
                        href={telLink(lead.phone)}
                        className="hover:underline"
                      >
                        {lead.phone}
                      </a>
                      {lead.phone && (
                        <a
                          href={whatsappLink(lead.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 text-[11px] font-medium"
                          title="Chat on WhatsApp"
                        >
                          WA
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{lead.city || "—"}</TableCell>
                  <TableCell className="text-xs">{lead.eventType || "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateIST(lead.targetDate)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {lead.source ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                        {lead.source}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium">
                    {lead.quotedAmount !== null && lead.quotedAmount !== undefined
                      ? inr(lead.quotedAmount)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {lead.nextFollowUp ? (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isOverdue
                            ? "text-primary font-bold"
                            : "text-foreground"
                        }`}
                      >
                        {isOverdue && <ClockAlertIcon className="h-3.5 w-3.5 text-primary shrink-0" />}
                        {formatDateIST(lead.nextFollowUp)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.owner?.name ?? "Unassigned"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View (<md) */}
      <div className="grid gap-3 md:hidden">
        {leads.map((lead) => {
          const isOverdue =
            lead.nextFollowUp &&
            new Date(lead.nextFollowUp) < startToday &&
            lead.status !== "WON" &&
            lead.status !== "LOST";

          return (
            <Card key={lead.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/leads/${lead.code}`}
                    className="font-mono text-xs font-bold text-primary underline"
                  >
                    {lead.code}
                  </Link>
                  <h3 className="font-semibold text-base leading-tight mt-0.5">
                    <Link href={`/leads/${lead.code}`}>{lead.clientName}</Link>
                  </h3>
                </div>
                <StatusBadge status={lead.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t">
                {lead.city && (
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{lead.city}</span>
                  </div>
                )}
                {lead.eventType && (
                  <div>
                    <span className="font-medium text-foreground">Event: </span>
                    {lead.eventType}
                  </div>
                )}
                {lead.targetDate && (
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>Target: {formatDateIST(lead.targetDate)}</span>
                  </div>
                )}
                {lead.quotedAmount !== null && lead.quotedAmount !== undefined && (
                  <div>
                    <span className="font-medium text-foreground">Quoted: </span>
                    <span className="font-semibold text-foreground">
                      {inr(lead.quotedAmount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <div>
                  <span className="text-muted-foreground">Follow-up: </span>
                  {lead.nextFollowUp ? (
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isOverdue ? "text-primary font-bold" : "text-foreground"
                      }`}
                    >
                      {isOverdue && <ClockAlertIcon className="h-3 w-3 text-primary" />}
                      {formatDateIST(lead.nextFollowUp)}
                    </span>
                  ) : (
                    "None"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={telLink(lead.phone)}
                    className="p-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    title="Call"
                  >
                    <PhoneIcon className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={whatsappLink(lead.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700"
                  >
                    WA
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls & Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
        <div>
          Showing <span className="font-medium text-foreground">{startRecord}</span>-
          <span className="font-medium text-foreground">{endRecord}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> leads
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={page > 1 ? getPageUrl(page - 1) : "#"}
            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            <Button variant="outline" size="sm" disabled={page <= 1} className="gap-1">
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </Button>
          </Link>

          <span className="px-3 text-xs font-medium">
            Page {page} of {totalPages}
          </span>

          <Link
            href={page < totalPages ? getPageUrl(page + 1) : "#"}
            className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="gap-1"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
