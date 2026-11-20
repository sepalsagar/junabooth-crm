"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from "recharts";
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
  // Only rank cities that are actually booked (> 0 bookings), ranked descending
  const rankedData = (data || [])
    .filter((d) => d.count > 0 && d.city && d.city.trim() !== "")
    .sort((a, b) => b.count - a.count);

  const hasData = rankedData.length > 0;
  const chartHeight = Math.max(220, rankedData.length * 34);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Events by City</CardTitle>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {rankedData.length} Booked {rankedData.length === 1 ? "City" : "Cities"}
          </span>
        </div>
        <CardDescription className="text-xs">
          Ranked active bookings across operational markets
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasData ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No booked cities yet.
          </div>
        ) : (
          <div style={{ height: `${chartHeight}px` }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rankedData}
                layout="vertical"
                margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <YAxis
                  dataKey="city"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={115}
                  tick={{ fill: "currentColor", fontSize: 11 }}
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
                <Bar dataKey="count" fill="#c2410c" radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fill: "currentColor", fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
