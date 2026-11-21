import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requirePageRole } from "@/features/auth/guards";
import { ProfitSummary } from "@/features/trips/components/profit-summary";
import { PlanetChooser } from "@/features/trips/components/planet-chooser";
import { StopCard } from "@/features/trips/components/stop-card";
import { TripBuilder } from "@/features/trips/components/trip-builder";
import { TripSteps } from "@/features/trips/components/trip-steps";
import {
  getMyOpenTrip,
  getMyTrip,
  listAvailableOrders,
  listPlanetsForTrip,
  type TripDetail,
} from "@/features/trips/service";
import { tripCode, tripLabel } from "@/features/trips/status";
import { formatUtc } from "@/lib/dates";

export const metadata: Metadata = { title: "My trip" };

// The trip that just finished, for the summary. A bad or foreign ID shows nothing.
async function finishedTrip(id: string | string[] | undefined): Promise<TripDetail | null> {
  if (typeof id !== "string") return null;
  const trip = await getMyTrip(id).catch(() => null);
  return trip?.status === "COMPLETED" ? trip : null;
}

export default async function CaptainTripPage({ searchParams }: PageProps<"/captain/trip">) {
  await requirePageRole("captain");
  const trip = await getMyOpenTrip();

  if (!trip) {
    const [planets, finished] = await Promise.all([
      listPlanetsForTrip(),
      finishedTrip((await searchParams).completed),
    ]);
    return (
      <>
        <PageHeader title="My trip" description="Choose a planet to start a new trip." />
        {finished?.completedAt && (
          <div role="status" className="mb-6 rounded-lg border border-emerald-600/30 bg-emerald-50 p-4 text-sm dark:bg-emerald-950/40">
            <p className="font-medium">Trip completed</p>
            <p className="text-muted-foreground">
              {tripCode(finished.number)} to {finished.planet.name}: {finished.totalUnits} units in{" "}
              {finished.stops.length} {finished.stops.length === 1 ? "stop" : "stops"}, delivered on{" "}
              {formatUtc(finished.completedAt)}. Start a new trip below.
            </p>
          </div>
        )}
        <PlanetChooser planets={planets} />
      </>
    );
  }

  const header = (
    <PageHeader
      title={`${tripCode(trip.number)} to ${trip.planet.name}`}
      description={`${trip.planet.daysFromEarth} days from Earth. One trip carries at most 20 units.`}
    >
      <StatusBadge label={tripLabel(trip.status)} tone={trip.status === "PLANNING" ? "neutral" : "info"} />
    </PageHeader>
  );

  // After loading the orders are fixed, so nothing more can be added to cover the fuel.
  const money = (
    <div className="mb-4">
      <ProfitSummary trip={{ ...trip, unitsToBreakEven: 0 }} />
    </div>
  );

  if (trip.status === "PLANNING") {
    return (
      <>
        {header}
        <TripBuilder trip={trip} available={await listAvailableOrders(trip.id)} now={new Date()} />
      </>
    );
  }

  if (trip.status === "LANDED") {
    return (
      <>
        {header}
        {money}
        <p className="mb-4 text-sm text-muted-foreground">
          Deliver the stops in any order. The trip completes when the last one is delivered.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {trip.stops.map((stop) => (
            <StopCard key={stop.divisionId} tripId={trip.id} stop={stop} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {money}
      <TripSteps trip={trip} />
    </>
  );
}
