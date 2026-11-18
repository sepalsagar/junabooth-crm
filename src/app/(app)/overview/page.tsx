import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";
import { formatDateIST, startOfTodayIST } from "@/lib/dates";
import { getFollowUpsDue } from "@/features/leads/queries";
import { StatusBadge } from "@/features/leads/components/status-badge";
import { telLink, whatsappLink } from "@/features/leads/phone";
import { ClockAlertIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";
import { getOverviewMoney } from "@/features/bookings/queries";

export default async function OverviewPage() {
  const now = new Date();
  const startToday = startOfTodayIST(now);

  const [leads, bookings, payments, expenses, followUps, money] = await Promise.all([
    db.lead.count(),
    db.booking.count(),
    db.payment.count(),
    db.expense.count(),
    getFollowUpsDue(now),
    getOverviewMoney(),
  ]);

  const metrics = [
    ["Leads", leads],
    ["Bookings", bookings],
    ["Payments", payments],
    ["Expenses", expenses],
    ["Balance to collect", inr(money.balanceToCollect)],
    ["Received to date", inr(money.receivedToDate)],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Overview</h1>

      {/* Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Live database total
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Follow Up Today Card */}
      <section>
        <Card className="border-primary/20 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ClockAlertIcon className="h-5 w-5 text-primary" />
                <span>Follow Up Today</span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({followUps.length} overdue or due today)
                </span>
              </CardTitle>
              <CardDescription>
                Prioritize reaching out to these leads to keep the pipeline moving.
              </CardDescription>
            </div>
            <Link href="/leads?followUp=today">
              <Button variant="outline" size="sm">
                View in Leads
              </Button>
            </Link>
          </CardHeader>

          <CardContent>
            {followUps.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All caught up! No follow-ups overdue or due today.
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {followUps.slice(0, 8).map((lead) => {
                  const isOverdue =
                    lead.nextFollowUp && new Date(lead.nextFollowUp) < startToday;

                  return (
                    <div
                      key={lead.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/leads/${lead.code}`}
                            className="font-mono text-xs font-bold text-primary hover:underline"
                          >
                            {lead.code}
                          </Link>
                          <span className="font-semibold text-sm">
                            <Link href={`/leads/${lead.code}`}>
                              {lead.clientName}
                            </Link>
                          </span>
                          <StatusBadge status={lead.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {lead.city && <span>{lead.city}</span>}
                          {lead.eventType && <span>• {lead.eventType}</span>}
                          {lead.quotedAmount !== null && lead.quotedAmount !== undefined && (
                            <span>• {inr(lead.quotedAmount)}</span>
                          )}
                          <span
                            className={
                              isOverdue
                                ? "font-semibold text-primary"
                                : "text-foreground"
                            }
                          >
                            • Due: {formatDateIST(lead.nextFollowUp)}
                            {isOverdue && " (Overdue)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {lead.phone && (
                          <a
                            href={whatsappLink(lead.phone)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button
                              size="xs"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-7 text-xs"
                            >
                              <MessageSquareIcon className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </Button>
                          </a>
                        )}
                        {lead.phone && (
                          <a href={telLink(lead.phone)}>
                            <Button variant="outline" size="xs" className="h-7">
                              <PhoneIcon className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
