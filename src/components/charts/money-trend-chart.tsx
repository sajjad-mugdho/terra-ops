"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { moneyTooltipRow } from "@/components/charts/money-tooltip";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatMoneyCompact } from "@/lib/money";

export type ChartSeries = { key: string; label: string; color: string };

type Props = {
  // label is the x axis text. Every series key holds an amount in cents.
  points: ({ label: string } & Record<string, string | number>)[];
  series: ChartSeries[];
};

// Money over time on one axis. One series gets a light fill, more get plain lines and a legend.
export function MoneyTrendChart({ points, series }: Props) {
  const config: ChartConfig = Object.fromEntries(
    series.map((each) => [each.key, { label: each.label, color: each.color }]),
  );
  const single = series.length === 1;

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart accessibilityLayer data={points} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={52} tickCount={5} tickFormatter={formatMoneyCompact} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value, name, item) =>
                moneyTooltipRow(config[String(name)]?.label, Number(value), item.color)
              }
            />
          }
        />
        {series.map((each) => (
          <Area
            key={each.key}
            dataKey={each.key}
            type="linear"
            stroke={`var(--color-${each.key})`}
            strokeWidth={2}
            fill={`var(--color-${each.key})`}
            fillOpacity={single ? 0.1 : 0}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
        {!single && <ChartLegend itemSorter={null} content={<ChartLegendContent />} />}
      </AreaChart>
    </ChartContainer>
  );
}
