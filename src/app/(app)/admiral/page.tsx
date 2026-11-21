import type { Metadata } from "next";
import { DateRangeFilter } from "@/components/date-range-filter";
import { PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";
import { OverdueCard } from "@/features/reports/components/overdue-card";
import { PipelineList } from "@/features/reports/components/pipeline-list";
import { PlanetProductTable } from "@/features/reports/components/planet-product-table";
import { PlanetProfitSummary } from "@/features/reports/components/planet-profit-summary";
import { TotalsCards } from "@/features/reports/components/totals-cards";
import { parseRange } from "@/features/reports/range";
import {
  getCompanyTotals,
  getOverdueCount,
  getPipeline,
  getPlanetProductTable,
  getPlanetProfitSummary,
} from "@/features/reports/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdmiralHomePage({ searchParams }: PageProps<"/admiral">) {
  await requirePageRole("admiral");
  const { from, to } = await searchParams;
  const range = parseRange(from, to);
  const [totals, summary, table, pipeline, overdue] = await Promise.all([
    getCompanyTotals(range),
    getPlanetProfitSummary(range),
    getPlanetProductTable(range),
    getPipeline(),
    getOverdueCount(),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Delivered orders only, by delivery date. Revenue is the product amount: delivery charges go to the captains."
      />
      <DateRangeFilter path="/admiral" from={range.from} to={range.to} />

      <div className="flex flex-col gap-8">
        <TotalsCards totals={totals} />
        {totals.unitsDelivered === 0 && (
          <p role="status" className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Nothing was delivered from {range.from} to {range.to}. Pick another range, or check the
            pipeline below for orders on the way.
          </p>
        )}

        <section aria-labelledby="by-planet" className="flex flex-col gap-3">
          <h2 id="by-planet" className="text-lg font-semibold">
            Profit by planet
          </h2>
          <PlanetProfitSummary rows={summary} />
        </section>

        <section aria-labelledby="by-product" className="flex flex-col gap-3">
          <h2 id="by-product" className="text-lg font-semibold">
            Planet by product
          </h2>
          <PlanetProductTable planets={table} totals={totals} />
        </section>

        <section aria-labelledby="pipeline" className="flex flex-col gap-3">
          <div>
            <h2 id="pipeline" className="text-lg font-semibold">
              Pipeline
            </h2>
            <p className="text-sm text-muted-foreground">
              Orders right now, in every status. The date range does not apply here.
            </p>
          </div>
          <OverdueCard count={overdue.count} />
          <PipelineList rows={pipeline} now={new Date()} />
        </section>
      </div>
    </>
  );
}
