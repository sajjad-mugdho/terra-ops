"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { moneyTooltipRow } from "@/components/charts/money-tooltip";
import type { ChartSeries } from "@/components/charts/money-trend-chart";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

type Props = {
  // name is the category. Every series key holds an amount in cents.
  rows: ({ name: string } & Record<string, string | number>)[];
  series: ChartSeries[];
  // ranked: one horizontal bar per row with its amount at the tip. Otherwise columns.
  ranked?: boolean;
};

export function MoneyBarChart({ rows, series, ranked = false }: Props) {
  const config: ChartConfig = Object.fromEntries(
    series.map((each) => [each.key, { label: each.label, color: each.color }]),
  );
  const tooltip = (
    <ChartTooltip
      cursor={{ fill: "var(--muted)" }}
      content={
        <ChartTooltipContent
          formatter={(value, name, item) =>
            moneyTooltipRow(config[String(name)]?.label, Number(value), item.color)
          }
        />
      }
    />
  );

  if (ranked) {
    return (
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: rows.length * 36 + 8 }}
      >
        <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 0, right: 72 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={76} />
          {tooltip}
          {series.map((each) => (
            <Bar
              key={each.key}
              dataKey={each.key}
              fill={`var(--color-${each.key})`}
              radius={4}
              maxBarSize={18}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={each.key}
                position="right"
                className="fill-foreground"
                formatter={(value: unknown) => formatMoney(Number(value))}
              />
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart accessibilityLayer data={rows} barGap={2} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={52} tickCount={5} tickFormatter={formatMoneyCompact} />
        {tooltip}
        {series.map((each) => (
          <Bar
            key={each.key}
            dataKey={each.key}
            fill={`var(--color-${each.key})`}
            radius={[4, 4, 0, 0]}
            barSize={rows.length <= 8 ? 20 : undefined}
            maxBarSize={24}
            isAnimationActive={false}
          />
        ))}
        {series.length > 1 && <ChartLegend itemSorter={null} content={<ChartLegendContent />} />}
      </BarChart>
    </ChartContainer>
  );
}
