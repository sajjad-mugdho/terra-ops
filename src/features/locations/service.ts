import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { divisions, planets, sectors } from "@/db/schema";
import { requireUser } from "@/features/auth/session";
import { AppError } from "@/lib/errors";

export type DivisionNode = { id: string; name: string };
export type SectorNode = { id: string; name: string; divisions: DivisionNode[] };
export type PlanetNode = {
  id: string;
  name: string;
  daysFromEarth: number;
  deliveryChargeCents: number;
  sectors: SectorNode[];
};

export async function listLocationTree(): Promise<PlanetNode[]> {
  await requireUser();

  const rows = await db
    .select({
      planetId: planets.id,
      planetName: planets.name,
      daysFromEarth: planets.daysFromEarth,
      deliveryChargeCents: planets.deliveryChargeCents,
      sectorId: sectors.id,
      sectorName: sectors.name,
      divisionId: divisions.id,
      divisionName: divisions.name,
    })
    .from(planets)
    .leftJoin(sectors, eq(sectors.planetId, planets.id))
    .leftJoin(divisions, eq(divisions.sectorId, sectors.id))
    .orderBy(asc(planets.name), asc(sectors.name), asc(divisions.name));

  const tree: PlanetNode[] = [];
  for (const row of rows) {
    let planet = tree.at(-1);
    if (planet?.id !== row.planetId) {
      planet = {
        id: row.planetId,
        name: row.planetName,
        daysFromEarth: row.daysFromEarth,
        deliveryChargeCents: row.deliveryChargeCents,
        sectors: [],
      };
      tree.push(planet);
    }
    if (!row.sectorId || !row.sectorName) continue;
    let sector = planet.sectors.at(-1);
    if (sector?.id !== row.sectorId) {
      sector = { id: row.sectorId, name: row.sectorName, divisions: [] };
      planet.sectors.push(sector);
    }
    if (row.divisionId && row.divisionName) {
      sector.divisions.push({ id: row.divisionId, name: row.divisionName });
    }
  }
  return tree;
}

export type DivisionWithPlanet = {
  divisionId: string;
  sectorId: string;
  planetId: string;
  deliveryChargeCents: number;
  names: { planet: string; sector: string; division: string };
};

export async function getDivisionWithPlanet(divisionId: string): Promise<DivisionWithPlanet> {
  await requireUser();
  if (!z.uuid().safeParse(divisionId).success) throw new AppError("INVALID", "Unknown address");

  const [row] = await db
    .select({
      divisionId: divisions.id,
      sectorId: sectors.id,
      planetId: planets.id,
      deliveryChargeCents: planets.deliveryChargeCents,
      planet: planets.name,
      sector: sectors.name,
      division: divisions.name,
    })
    .from(divisions)
    .innerJoin(sectors, eq(sectors.id, divisions.sectorId))
    .innerJoin(planets, eq(planets.id, divisions.planetId))
    .where(eq(divisions.id, divisionId));
  if (!row) throw new AppError("INVALID", "Unknown address");

  const { planet, sector, division, ...ids } = row;
  return { ...ids, names: { planet, sector, division } };
}
