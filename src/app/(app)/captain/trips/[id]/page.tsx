import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { TripOverview } from "@/features/trips/components/trip-overview";
import { getMyTrip, getMyTripRow } from "@/features/trips/service";
import { tripCode } from "@/features/trips/status";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Trip" };

export default async function CaptainTripDetailPage({ params }: PageProps<"/captain/trips/[id]">) {
  await requirePageRole("captain");
  const { id } = await params;
  // Another captain's trip looks exactly like a trip that does not exist.
  const found = await Promise.all([getMyTrip(id), getMyTripRow(id)]).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!found) notFound();
  const [trip, money] = found;

  return (
    <>
      <PageHeader title={`${tripCode(trip.number)} to ${trip.planet.name}`} description="Your trip, in Earth time (UTC).">
        <Button variant="outline" nativeButton={false} render={<Link href="/captain/trips" />}>
          All trips
        </Button>
      </PageHeader>
      <TripOverview trip={trip} money={money} />
    </>
  );
}
