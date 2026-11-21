import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { TripOverview } from "@/features/trips/components/trip-overview";
import { getAnyTrip } from "@/features/trips/service";
import { tripCode } from "@/features/trips/status";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Trip" };

export default async function AdmiralTripPage({ params }: PageProps<"/admiral/trips/[id]">) {
  await requirePageRole("admiral");
  const { id } = await params;
  const trip = await getAnyTrip(id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!trip) notFound();

  return (
    <>
      <PageHeader title={`${tripCode(trip.number)} to ${trip.planet.name}`} description="Read-only, in Earth time (UTC).">
        <Button variant="outline" nativeButton={false} render={<Link href="/admiral/trips" />}>
          All trips
        </Button>
      </PageHeader>
      <TripOverview trip={trip} money={trip} captainName={trip.captainName} />
    </>
  );
}
