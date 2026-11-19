"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

interface EventsByCityChartProps {
  data: Array<{
    city: string;
    count: number;
  }>;
}

const chartConfig = {
  count: {
    label: "Events",
    color: "#c2410c",
  },
} satisfies ChartConfig;

export function EventsByCityChart({ data }: EventsByCityChartProps) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Events by City</CardTitle>
        <CardDescription className="text-xs">
          Distribution of active bookings across regions
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No events found.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full aspect-auto">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <YAxis
                dataKey="city"
                type="category"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as { city: string; count: number };
                  return (
                    <div className="rounded-lg border bg-popover p-2 text-xs shadow-md">
                      <span className="font-semibold">{item.city}: </span>
                      <span>{item.count} events</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="#c2410c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
