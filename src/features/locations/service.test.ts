import { beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "@/seed/reference";
import { actAs, actAsNobody } from "@/test/session";
import { getDivisionWithPlanet, listLocationTree } from "./service";

beforeAll(seedReference);

describe("listLocationTree", () => {
  it("throws UNAUTHORIZED without a session", async () => {
    actAsNobody();
    await expect(listLocationTree()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns every planet with sectors and divisions, sorted by name", async () => {
    await actAs("customer1@terra.demo");
    const tree = await listLocationTree();

    const sorted = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b));
    const planetNames = tree.map((planet) => planet.name);
    expect(planetNames).toEqual(["Jupiter", "Mars", "Mercury", "Neptune", "Saturn", "Uranus", "Venus"]);
    expect(planetNames).not.toContain("Earth");

    for (const planet of tree) {
      expect(planet.sectors).toHaveLength(2);
      expect(planet.sectors.map((s) => s.name)).toEqual(sorted(planet.sectors.map((s) => s.name)));
      for (const sector of planet.sectors) {
        expect(sector.divisions.length).toBeGreaterThanOrEqual(2);
        expect(sector.divisions.map((d) => d.name)).toEqual(sorted(sector.divisions.map((d) => d.name)));
      }
    }
  });

  it("returns the delivery charge but never the fuel cost", async () => {
    await actAs("customer1@terra.demo");
    const mars = (await listLocationTree()).find((planet) => planet.name === "Mars");
    expect(mars).toMatchObject({ daysFromEarth: 4, deliveryChargeCents: 500 });
    expect(mars).not.toHaveProperty("fuelCostCents");
  });
});

describe("getDivisionWithPlanet", () => {
  it("derives sector and planet from the division", async () => {
    await actAs("customer1@terra.demo");
    const mars = (await listLocationTree()).find((planet) => planet.name === "Mars")!;
    const olympus = mars.sectors.find((sector) => sector.name === "Olympus Sector")!;
    const division7 = olympus.divisions.find((division) => division.name === "Division 7")!;

    expect(await getDivisionWithPlanet(division7.id)).toEqual({
      divisionId: division7.id,
      sectorId: olympus.id,
      planetId: mars.id,
      deliveryChargeCents: 500,
      names: { planet: "Mars", sector: "Olympus Sector", division: "Division 7" },
    });
  });

  it.each(["not-a-uuid", "", "00000000-0000-4000-8000-000000000000"])(
    "throws INVALID for %j",
    async (id) => {
      await actAs("customer1@terra.demo");
      await expect(getDivisionWithPlanet(id)).rejects.toMatchObject({ code: "INVALID" });
    },
  );
});
