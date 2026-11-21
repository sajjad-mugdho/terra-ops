import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { Money } from "@/components/money";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { EarningsSummary } from "@/features/reports/components/earnings-summary";
import { getMyEarnings } from "@/features/reports/service";
import { TripTable } from "@/features/trips/components/trip-table";
import { getMyOpenTrip, listMyTrips } from "@/features/trips/service";
import { parseTripStatus, TRIP_STATUSES, tripCode, tripLabel } from "@/features/trips/status";
import { parsePage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Trips and earnings" };

const PATH = "/captain/trips";

export default async function CaptainTripsPage({ searchParams }: PageProps<"/captain/trips">) {
  await requirePageRole("captain");
  const params = await searchParams;
  const status = parseTripStatus(params.status);
  const [earnings, trips, open] = await Promise.all([
    getMyEarnings(),
    listMyTrips({ page: parsePage(params.page), status }),
    getMyOpenTrip(),
  ]);

  if (trips.total === 0 && !status) {
    return (
      <>
        <PageHeader title="Trips and earnings" description="Your trips, earnings, fuel cost and profit." />
        <EmptyState title="No trips yet" description="Your earnings appear here after your first trip.">
          <Button nativeButton={false} render={<Link href="/captain/trip" />}>
            Start a trip
          </Button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Trips and earnings"
        description="Totals count completed trips only. Earnings are the delivery charges of a trip's orders. Profit is earnings minus fuel."
      />
      <div className="flex flex-col gap-8">
        <EarningsSummary earnings={earnings} />

        {open && (
          <section aria-labelledby="expected" className="rounded-lg border border-dashed p-4 text-sm">
            <h2 id="expected" className="font-medium">
              Expected · {tripCode(open.number)} to {open.planet.name} ({tripLabel(open.status)})
            </h2>
            <p className="mt-1 text-muted-foreground">
              {open.totalUnits} units on this trip. Expected earnings <Money cents={open.earningsCents} />, fuel{" "}
              <Money cents={open.fuelCostCents} />, expected profit{" "}
              <Money cents={open.expectedProfitCents} className="font-medium" />. Not in the totals until the trip is
              completed.
            </p>
            <Link href={`/captain/trips/${open.id}`} className="mt-2 inline-block underline underline-offset-4">
              Trip detail
            </Link>
          </section>
        )}

        <section aria-labelledby="history" className="flex flex-col gap-3">
          <h2 id="history" className="text-lg font-semibold">
            Trip history
          </h2>
          <ListFilters
            path={PATH}
            selects={[
              {
                name: "status",
                label: "Status",
                value: status ?? "",
                options: TRIP_STATUSES.map((each) => ({ value: each, label: tripLabel(each) })),
              },
            ]}
          />
          {trips.total === 0 ? (
            <EmptyState title="No trips match" description="You have no trip in this status.">
              <Button variant="outline" nativeButton={false} render={<Link href={PATH} />}>
                Clear
              </Button>
            </EmptyState>
          ) : (
            <div>
              <TripTable rows={trips.rows} basePath={PATH} />
              <Pagination path={PATH} params={{ status }} {...trips} one="trip" many="trips" />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
