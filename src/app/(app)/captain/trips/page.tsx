import type { Metadata } from "next";
import Link from "next/link";
import { Money } from "@/components/money";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { EarningsSummary } from "@/features/reports/components/earnings-summary";
import { getMyEarnings } from "@/features/reports/service";
import { TripTable } from "@/features/trips/components/trip-table";
import { listMyTrips } from "@/features/trips/service";
import { isOpenTrip, tripCode, tripLabel } from "@/features/trips/status";

export const metadata: Metadata = { title: "Trips and earnings" };

export default async function CaptainTripsPage() {
  await requirePageRole("captain");
  const [earnings, trips] = await Promise.all([getMyEarnings(), listMyTrips()]);
  const open = trips.find((trip) => isOpenTrip(trip.status));
  const closed = trips.filter((trip) => !isOpenTrip(trip.status));

  if (trips.length === 0) {
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
              Expected · {tripCode(open.number)} to {open.planet} ({tripLabel(open.status)})
            </h2>
            <p className="mt-1 text-muted-foreground">
              {open.totalUnits} units on this trip. Expected earnings <Money cents={open.earningsCents} />, fuel{" "}
              <Money cents={open.fuelCostCents} />, expected profit{" "}
              <Money cents={open.profitCents} className="font-medium" />. Not in the totals until the trip is
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
          {closed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed or cancelled trips yet.</p>
          ) : (
            <TripTable rows={closed} basePath="/captain/trips" />
          )}
        </section>
      </div>
    </>
  );
}
