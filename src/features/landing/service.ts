import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { planets, products } from "@/db/schema";

export type LandingPlanet = { name: string; daysFromEarth: number; deliveryChargeCents: number };
export type LandingProduct = { name: string; priceCents: number };
export type LandingCatalog = { planets: LandingPlanet[]; products: LandingProduct[] };

// Public on purpose (D65): only what any customer sees at checkout. Never a cost or a profit.
export async function getLandingCatalog(): Promise<LandingCatalog> {
  const [planetRows, productRows] = await Promise.all([
    db
      .select({
        name: planets.name,
        daysFromEarth: planets.daysFromEarth,
        deliveryChargeCents: planets.deliveryChargeCents,
      })
      .from(planets)
      .orderBy(asc(planets.daysFromEarth), asc(planets.name)),
    db
      .select({ name: products.name, priceCents: products.priceCents })
      .from(products)
      .orderBy(asc(products.name)),
  ]);
  return { planets: planetRows, products: productRows };
}
