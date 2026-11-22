import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { PlanetTable } from "@/features/settings/components/planet-table";
import { listPlanetsForAdmiral } from "@/features/settings/service";

export const metadata: Metadata = { title: "Planets" };

export default async function AdmiralPlanetsPage() {
  await requirePageRole("admiral");
  const planets = await listPlanetsForAdmiral();

  return (
    <>
      <PageHeader
        title="Planets"
        description="Delivery charge applies to new orders only. Fuel cost applies to new trips only. Days from Earth is fixed."
      >
        <Button variant="outline" nativeButton={false} render={<Link href="/admiral/history?entity=planet" />}>
          Change history
        </Button>
      </PageHeader>
      <PlanetTable planets={planets} />
    </>
  );
}
