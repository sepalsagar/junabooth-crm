"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { inr, inrCompact } from "@/lib/format";

interface RevenueByMonthChartProps {
  data: Array<{
    month: string;
    completed: number;
    upcoming: number;
  }>;
}

const chartConfig = {
  completed: {
    label: "Completed",
    color: "#c2410c", // Brand terracotta primary
  },
  upcoming: {
    label: "Booked / Upcoming",
    color: "#f4a261", // Accent gold/sand
  },
} satisfies ChartConfig;

export function RevenueByMonthChart({ data }: RevenueByMonthChartProps) {
  const hasData = data.some((d) => d.completed > 0 || d.upcoming > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Revenue by Month</CardTitle>
            <CardDescription className="text-xs">
              Completed events vs. booked upcoming slots (IST event month)
            </CardDescription>
          </div>
          {/* Text legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#c2410c]" />
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#f4a261]" />
              <span className="text-muted-foreground">Booked / Upcoming</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No revenue recorded for this period.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full aspect-auto">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                domain={[0, "auto"]}
                tickFormatter={(val: number) => inrCompact(val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as {
                    month: string;
                    completed: number;
                    upcoming: number;
                  };
                  return (
                    <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md">
                      <p className="font-semibold">{item.month}</p>
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#c2410c]">Completed:</span>
                          <span className="font-mono font-medium">{inr(item.completed)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#f4a261]">Upcoming:</span>
                          <span className="font-mono font-medium">{inr(item.upcoming)}</span>
                        </div>
                        <div className="border-t pt-1 flex items-center justify-between gap-4 font-bold">
                          <span>Total:</span>
                          <span>{inr(item.completed + item.upcoming)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="completed" stackId="revenue" fill="#c2410c" radius={[0, 0, 0, 0]} />
              <Bar dataKey="upcoming" stackId="revenue" fill="#f4a261" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
