import { beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "@/seed/reference";
import { deepKeys } from "@/test/orders";
import { actAs, actAsNobody } from "@/test/session";
import { getLandingCatalog } from "./service";

beforeAll(seedReference);

describe("getLandingCatalog", () => {
  it("answers a visitor who is not signed in", async () => {
    actAsNobody();
    const catalog = await getLandingCatalog();

    expect(catalog.planets).toHaveLength(7);
    expect(catalog.products).toHaveLength(5);
  });

  it("lists planets from the nearest to the farthest", async () => {
    actAsNobody();
    const { planets } = await getLandingCatalog();

    expect(planets.map((planet) => planet.name)).toEqual([
      "Venus",
      "Mercury",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
    ]);
    expect(planets.find((planet) => planet.name === "Mars")).toEqual({
      name: "Mars",
      daysFromEarth: 4,
      deliveryChargeCents: 500,
    });
  });

  it("lists products by name with the selling price", async () => {
    actAsNobody();
    const { products } = await getLandingCatalog();

    expect(products.map((product) => product.name)).toEqual(["Food", "Machines", "Oxygen", "Plants", "Water"]);
    expect(products.find((product) => product.name === "Water")).toEqual({ name: "Water", priceCents: 1000 });
  });

  it("never exposes a cost, a profit or an id, signed in or not", async () => {
    const allowed = ["planets", "products", "name", "daysFromEarth", "deliveryChargeCents", "priceCents"];

    actAsNobody();
    expect(new Set(deepKeys(await getLandingCatalog()))).toEqual(new Set(allowed));

    await actAs("admiral@terra.demo");
    expect(new Set(deepKeys(await getLandingCatalog()))).toEqual(new Set(allowed));
  });
});
