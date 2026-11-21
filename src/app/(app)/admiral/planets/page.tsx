import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
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
      />
      <PlanetTable planets={planets} />
    </>
  );
}
