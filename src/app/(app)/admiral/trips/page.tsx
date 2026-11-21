import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SelectFilters } from "@/components/select-filters";
import { requirePageRole } from "@/features/auth/guards";
import { listPlanetsForAdmiral } from "@/features/settings/service";
import { TripTable } from "@/features/trips/components/trip-table";
import { listAllTrips } from "@/features/trips/service";
import { parseTripStatus, TRIP_STATUSES, tripLabel } from "@/features/trips/status";

export const metadata: Metadata = { title: "Trips" };

export default async function AdmiralTripsPage({ searchParams }: PageProps<"/admiral/trips">) {
  await requirePageRole("admiral");
  const params = await searchParams;
  const status = parseTripStatus(params.status);
  const planets = await listPlanetsForAdmiral();
  const planetId = planets.find((planet) => planet.id === params.planet)?.id;
  const trips = await listAllTrips({ status, planetId });

  return (
    <>
      <PageHeader
        title="Trips"
        description="Every trip of every captain. Read-only. Earnings and profit belong to the captain, not the company."
      />
      <SelectFilters
        path="/admiral/trips"
        selects={[
          {
            name: "status",
            label: "Status",
            value: status ?? "",
            options: TRIP_STATUSES.map((each) => ({ value: each, label: tripLabel(each) })),
          },
          {
            name: "planet",
            label: "Planet",
            value: planetId ?? "",
            options: planets.map((planet) => ({ value: planet.id, label: planet.name })),
          },
        ]}
      />
      {trips.length === 0 ? (
        <EmptyState title="No trips found" description="No trip matches these filters." />
      ) : (
        <TripTable rows={trips} basePath="/admiral/trips" />
      )}
    </>
  );
}
