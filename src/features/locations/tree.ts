import type { DivisionNode, PlanetNode, SectorNode } from "./service";

export type DivisionPath = { planet: PlanetNode; sector: SectorNode; division: DivisionNode };

export function findDivision(tree: PlanetNode[], divisionId: string | null): DivisionPath | null {
  if (!divisionId) return null;
  for (const planet of tree) {
    for (const sector of planet.sectors) {
      const division = sector.divisions.find((each) => each.id === divisionId);
      if (division) return { planet, sector, division };
    }
  }
  return null;
}
