import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { listPlanetsForAdmiral } from "@/features/settings/service";
import { TripTable } from "@/features/trips/components/trip-table";
import { listAllTrips } from "@/features/trips/service";
import { parseTripStatus, TRIP_STATUSES, tripLabel } from "@/features/trips/status";
import { parsePage } from "@/lib/pagination";
import { parseSearch } from "@/lib/search";

export const metadata: Metadata = { title: "Trips" };

const PATH = "/admiral/trips";

export default async function AdmiralTripsPage({ searchParams }: PageProps<"/admiral/trips">) {
  await requirePageRole("admiral");
  const params = await searchParams;
  const status = parseTripStatus(params.status);
  const planets = await listPlanetsForAdmiral();
  const planetId = planets.find((planet) => planet.id === params.planet)?.id;
  const q = parseSearch(params.q);
  const filtered = q !== undefined || status !== undefined || planetId !== undefined;
  const trips = await listAllTrips({ page: parsePage(params.page), q, status, planetId });

  return (
    <>
      <PageHeader
        title="Trips"
        description="Every trip of every captain. Read-only. Earnings and profit belong to the captain, not the company."
      />
      <ListFilters
        path={PATH}
        search={{ label: "Search by trip code", placeholder: "TRP-101", value: q ?? "" }}
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
      {trips.total === 0 && !filtered ? (
        <EmptyState title="No trips yet" description="Trips of every captain appear here." />
      ) : trips.total === 0 ? (
        <EmptyState title="No trips match" description="No trip matches this search and these filters.">
          <Button variant="outline" nativeButton={false} render={<Link href={PATH} />}>
            Clear
          </Button>
        </EmptyState>
      ) : (
        <>
          <TripTable rows={trips.rows} basePath={PATH} />
          <Pagination path={PATH} params={{ q, status, planet: planetId }} {...trips} one="trip" many="trips" />
        </>
      )}
    </>
  );
}
