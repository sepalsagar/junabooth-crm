import { Suspense } from "react";
import { connection } from "next/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { balanceDue } from "@/lib/calc";
import { db } from "@/lib/db";
import { inr } from "@/lib/format";

function MetricCards({ metrics }: { metrics: [string, string | number, string][] }) {
  return <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label, value, detail]) => <Card key={label}><CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{detail}</CardContent></Card>)}</section>;
}

async function DashboardMetrics() {
  await connection();
  const [leads, bookings, payments, expenses, bookingRows] = await Promise.all([
    db.lead.count(), db.booking.count(), db.payment.count(), db.expense.count(),
    db.booking.findMany({ select: { basePrice: true, travelCharge: true, discount: true, payments: { select: { amount: true, kind: true } } } }),
  ]);
  const due = bookingRows.reduce((sum, booking) => sum + balanceDue(booking, booking.payments), 0);
  return <MetricCards metrics={[["Leads", leads, "All enquiries"], ["Bookings", bookings, "All booking statuses"], ["Payments", payments, "Recorded transactions"], ["Expenses", expenses, "Business and event costs"], ["Balance due", inr(due), "Calculated from payments"]]} />;
}

function MetricSkeleton() {
  return <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Card key={index} className="h-36 animate-pulse bg-muted" />)}</section>;
}

export default function Home() {
  return <main className="min-h-screen bg-background px-6 py-16 md:px-12"><div className="mx-auto max-w-6xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Junabooth CRM</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Foundation check</h1><p className="mt-3 text-muted-foreground">Live totals from the Junabooth database.</p><Suspense fallback={<MetricSkeleton />}><DashboardMetrics /></Suspense></div></main>;
}
