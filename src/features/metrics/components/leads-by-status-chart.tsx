"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type { LeadStatus } from "@/generated/prisma/client";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  FOLLOW_UP: "Follow Up",
  WON: "Won",
  LOST: "Lost",
  POSTPONED: "Postponed",
};

interface LeadsByStatusChartProps {
  data: Array<{
    status: LeadStatus;
    count: number;
  }>;
}

const chartConfig = {
  count: {
    label: "Leads",
    color: "#f4a261",
  },
} satisfies ChartConfig;

export function LeadsByStatusChart({ data }: LeadsByStatusChartProps) {
  const chartData = data.map((d) => ({
    status: d.status,
    label: STATUS_LABELS[d.status] || d.status,
    count: d.count,
  }));

  const hasData = chartData.some((d) => d.count > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Leads by Status</CardTitle>
            <CardDescription className="text-xs">
              Pipeline distribution (click pill to view leads)
            </CardDescription>
          </div>
          <Link
            href="/leads"
            className="text-xs text-primary hover:underline font-medium"
          >
            All leads &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {!hasData ? (
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            No leads recorded.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-44 w-full aspect-auto">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                tickMargin={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as {
                    status: LeadStatus;
                    label: string;
                    count: number;
                  };
                  return (
                    <div className="rounded-lg border bg-popover p-2 text-xs shadow-md">
                      <span className="font-semibold">{item.label}: </span>
                      <span>{item.count} leads</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="#f4a261" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}

        {/* Links to filtered views */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t">
          {chartData.map((d) => (
            <Link key={d.status} href={`/leads?status=${d.status}`}>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-muted/80 transition-colors">
                <span className="font-medium">{d.label}:</span>
                <span className="font-bold text-primary">{d.count}</span>
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
