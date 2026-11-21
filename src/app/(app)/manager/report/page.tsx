import type { Metadata } from "next";
import { DateRangeFilter } from "@/components/date-range-filter";
import { PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";
import { PurchasesTable } from "@/features/reports/components/purchases-table";
import { parseRange } from "@/features/reports/range";
import { getPlanetInProgress, getPlanetPurchases } from "@/features/reports/service";

export const metadata: Metadata = { title: "Purchases" };

export default async function ManagerReportPage({ searchParams }: PageProps<"/manager/report">) {
  const manager = await requirePageRole("manager");
  const { from, to } = await searchParams;
  const range = parseRange(from, to);
  // The planet comes from the session. Nothing in the URL can change it.
  const [delivered, inProgress] = await Promise.all([getPlanetPurchases(range), getPlanetInProgress()]);

  return (
    <>
      <PageHeader
        title="Purchases"
        description={`What ${manager.planetName ?? "your planet"} bought: units, product amounts and delivery charges.`}
      />
      <DateRangeFilter path="/manager/report" from={range.from} to={range.to} />

      <div className="flex flex-col gap-8">
        <section aria-labelledby="delivered" className="flex flex-col gap-3">
          <div>
            <h2 id="delivered" className="text-lg font-semibold">
              Delivered
            </h2>
            <p className="text-sm text-muted-foreground">
              Orders delivered from {range.from} to {range.to}.
              {delivered.total.units === 0 && " Nothing was delivered in this range."}
            </p>
          </div>
          <PurchasesTable purchases={delivered} />
        </section>

        <section aria-labelledby="in-progress" className="flex flex-col gap-3">
          <div>
            <h2 id="in-progress" className="text-lg font-semibold">
              In progress
            </h2>
            <p className="text-sm text-muted-foreground">
              Accepted orders that are not delivered yet, right now. The date range does not apply here.
              {inProgress.total.units === 0 && " Nothing is on the way."}
            </p>
          </div>
          <PurchasesTable purchases={inProgress} />
        </section>
      </div>
    </>
  );
}
