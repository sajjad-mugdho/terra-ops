import type { Metadata } from "next";
import { MoneyBarChart } from "@/components/charts/money-bar-chart";
import { MoneyTrendChart } from "@/components/charts/money-trend-chart";
import { DateRangeFilter } from "@/components/date-range-filter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requirePageRole } from "@/features/auth/guards";
import { PipelineList } from "@/features/reports/components/pipeline-list";
import { PlanetProductTable } from "@/features/reports/components/planet-product-table";
import { PlanetProfitSummary } from "@/features/reports/components/planet-profit-summary";
import { TotalsCards } from "@/features/reports/components/totals-cards";
import { parseRange } from "@/features/reports/range";
import { bucketLabel, previousPeriod } from "@/features/reports/series";
import {
  getCompanyTotals,
  getOverdueCount,
  getPipeline,
  getPlanetProductTable,
  getPlanetProfitSummary,
  getProfitSeries,
} from "@/features/reports/service";

export const metadata: Metadata = { title: "Dashboard" };

const DAY_MS = 86_400_000;

export default async function AdmiralHomePage({ searchParams }: PageProps<"/admiral">) {
  await requirePageRole("admiral");
  const { from, to } = await searchParams;
  const range = parseRange(from, to);
  const [totals, before, series, summary, table, pipeline, overdue] = await Promise.all([
    getCompanyTotals(range),
    getCompanyTotals(previousPeriod(range)),
    getProfitSeries(range),
    getPlanetProfitSummary(range),
    getPlanetProductTable(range),
    getPipeline(),
    getOverdueCount(),
  ]);
  const days = Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Delivered orders only, by delivery date. Revenue is the product amount: delivery charges go to the captains."
      />
      <DateRangeFilter path="/admiral" from={range.from} to={range.to} />

      <div className="flex flex-col gap-6">
        <TotalsCards totals={totals} before={before} against={`the ${days} days before`} overdue={overdue.count} />
        {totals.unitsDelivered === 0 && (
          <p role="status" className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Nothing was delivered from {range.from} to {range.to}. Pick another range, or check the
            pipeline below for orders on the way.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue and profit</CardTitle>
              <CardDescription>
                Per {series.unit}, from {range.from} to {range.to}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MoneyTrendChart
                points={series.points.map((point) => ({
                  label: bucketLabel(point.date, series.unit),
                  revenueCents: point.revenueCents,
                  profitCents: point.profitCents,
                }))}
                series={[
                  { key: "revenueCents", label: "Revenue", color: "var(--chart-1)" },
                  { key: "profitCents", label: "Profit", color: "var(--chart-2)" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Profit by planet</CardTitle>
              <CardDescription>Highest first. The same range.</CardDescription>
            </CardHeader>
            <CardContent>
              <MoneyBarChart
                ranked
                rows={summary.map((row) => ({ name: row.planet, profitCents: row.profitCents }))}
                series={[{ key: "profitCents", label: "Profit", color: "var(--chart-1)" }]}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Orders right now, in every status. The date range does not apply here.</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineList rows={pipeline} now={new Date()} />
          </CardContent>
        </Card>

        <section aria-labelledby="breakdown" className="flex flex-col gap-3">
          <h2 id="breakdown" className="text-lg font-semibold">
            Breakdown
          </h2>
          <Tabs defaultValue="planet">
            <TabsList>
              <TabsTrigger value="planet">By planet</TabsTrigger>
              <TabsTrigger value="product">By planet and product</TabsTrigger>
            </TabsList>
            <TabsContent value="planet">
              <PlanetProfitSummary rows={summary} />
            </TabsContent>
            <TabsContent value="product">
              <PlanetProductTable planets={table} totals={totals} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </>
  );
}
