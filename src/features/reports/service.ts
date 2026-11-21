import "server-only";
import { and, asc, eq, gte, inArray, lt, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, planets, products, trips } from "@/db/schema";
import { requireManagerPlanet, requireRole } from "@/features/auth/session";
import { ORDER_STATUSES, type OrderStatus } from "@/features/orders/status";
import { tripEarned } from "@/features/trips/service";
import { byProfitThenName } from "./ranking";

type Period = { start: Date; end: Date };

export type CompanyTotals = {
  unitsDelivered: number;
  revenueCents: number;
  makingCostCents: number;
  profitCents: number;
};

export type ProfitRow = {
  units: number;
  revenueCents: number;
  makingCostCents: number;
  profitCents: number;
};

export type PlanetProfit = ProfitRow & { planetId: string; planet: string };

export type PlanetProducts = {
  planetId: string;
  planet: string;
  rows: (ProfitRow & { product: string })[];
  subtotal: ProfitRow;
};

export type PipelineRow = { status: OrderStatus; count: number };

export type PurchaseRow = {
  units: number;
  productAmountCents: number;
  deliveryChargesCents: number;
  totalPaidCents: number;
};

export type Purchases = { rows: (PurchaseRow & { product: string })[]; total: PurchaseRow };

export type Earnings = {
  trips: number;
  units: number;
  earningsCents: number;
  fuelCents: number;
  profitCents: number;
};

// Accepted by the planet, not yet delivered (D31).
const IN_PROGRESS: OrderStatus[] = [
  "ACCEPTED",
  "ASSIGNED",
  "LOADED",
  "LIFTED_OFF",
  "LANDED",
  "AT_SECTOR",
];

// sum() of integers is a bigint, which the driver returns as text.
const total = (value: SQL) => sql<number>`coalesce(sum(${value}), 0)`.mapWith(Number);

// The one counting rule (D11): an order counts when it is DELIVERED, by delivered_at.
const deliveredIn = (period: Period) =>
  and(
    eq(orders.status, "DELIVERED"),
    gte(orders.deliveredAt, period.start),
    lt(orders.deliveredAt, period.end),
  );

// Frozen order lines. Drizzle writes a computed subquery column unqualified, so each alias is unique.
const soldLines = (where: SQL | undefined) =>
  db
    .select({
      planetId: orders.planetId,
      productId: orderItems.productId,
      units: orderItems.units,
      revenueCents: sql<number>`${orderItems.units}::bigint * ${orderItems.unitPriceCents}`.as(
        "sold_revenue",
      ),
      makingCostCents:
        sql<number>`${orderItems.units}::bigint * ${orderItems.unitMakingCostCents}`.as(
          "sold_making_cost",
        ),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(where)
    .as("sold");

const profitColumns = (sold: ReturnType<typeof soldLines>) => ({
  units: total(sql`${sold.units}`),
  revenueCents: total(sql`${sold.revenueCents}`),
  makingCostCents: total(sql`${sold.makingCostCents}`),
  profitCents: total(sql`${sold.revenueCents} - ${sold.makingCostCents}`),
});

const profitOf = (row: ProfitRow): ProfitRow => ({
  units: row.units,
  revenueCents: row.revenueCents,
  makingCostCents: row.makingCostCents,
  profitCents: row.profitCents,
});

export async function getCompanyTotals(period: Period): Promise<CompanyTotals> {
  await requireRole("admiral");
  const sold = soldLines(deliveredIn(period));
  const [row] = await db.select(profitColumns(sold)).from(sold);
  return {
    unitsDelivered: row.units,
    revenueCents: row.revenueCents,
    makingCostCents: row.makingCostCents,
    profitCents: row.profitCents,
  };
}

export async function getPlanetProfitSummary(period: Period): Promise<PlanetProfit[]> {
  await requireRole("admiral");
  const sold = soldLines(deliveredIn(period));
  const rows = await db
    .select({ planetId: planets.id, planet: planets.name, ...profitColumns(sold) })
    .from(planets)
    .leftJoin(sold, eq(sold.planetId, planets.id))
    .groupBy(planets.id, planets.name);
  return rows.sort(byProfitThenName);
}

export async function getPlanetProductTable(period: Period): Promise<PlanetProducts[]> {
  await requireRole("admiral");
  const sold = soldLines(deliveredIn(period));
  // One query gives the product rows and, from the same lines, each planet's subtotal.
  const rows = await db
    .select({
      planetId: planets.id,
      planet: planets.name,
      product: products.name,
      isSubtotal: sql<number>`grouping(${products.id})`.mapWith(Number),
      ...profitColumns(sold),
    })
    .from(planets)
    .innerJoin(products, sql`true`)
    .leftJoin(sold, and(eq(sold.planetId, planets.id), eq(sold.productId, products.id)))
    .groupBy(
      sql`grouping sets ((${planets.id}, ${planets.name}, ${products.id}, ${products.name}), (${planets.id}, ${planets.name}))`,
    )
    .orderBy(asc(products.name));

  const table = rows
    .filter((row) => row.isSubtotal === 1)
    .map((planet) => ({
      planetId: planet.planetId,
      planet: planet.planet,
      rows: rows
        .filter((row) => row.planetId === planet.planetId && row.isSubtotal === 0)
        .map((row) => ({ product: row.product, ...profitOf(row) })),
      subtotal: profitOf(planet),
    }));
  // Same rule as the summary, applied to the subtotals.
  return table.sort((a, b) =>
    byProfitThenName(
      { planet: a.planet, profitCents: a.subtotal.profitCents },
      { planet: b.planet, profitCents: b.subtotal.profitCents },
    ),
  );
}

// The present: every status, whatever the date range.
export async function getPipeline(): Promise<PipelineRow[]> {
  await requireRole("admiral");
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)::int` })
    .from(orders)
    .groupBy(orders.status);
  return ORDER_STATUSES.map((status) => ({
    status,
    count: rows.find((row) => row.status === status)?.count ?? 0,
  }));
}

// No making cost is selected here, so a manager report has nothing to leak.
async function purchases(where: SQL | undefined): Promise<Purchases> {
  const bought = db
    .select({
      productId: orderItems.productId,
      units: orderItems.units,
      productAmountCents: sql<number>`${orderItems.units}::bigint * ${orderItems.unitPriceCents}`.as(
        "bought_amount",
      ),
      deliveryChargesCents:
        sql<number>`${orderItems.units}::bigint * ${orderItems.unitDeliveryChargeCents}`.as(
          "bought_delivery",
        ),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(where)
    .as("bought");

  const rows = await db
    .select({
      product: products.name,
      isTotal: sql<number>`grouping(${products.id})`.mapWith(Number),
      units: total(sql`${bought.units}`),
      productAmountCents: total(sql`${bought.productAmountCents}`),
      deliveryChargesCents: total(sql`${bought.deliveryChargesCents}`),
      totalPaidCents: total(sql`${bought.productAmountCents} + ${bought.deliveryChargesCents}`),
    })
    .from(products)
    .leftJoin(bought, eq(bought.productId, products.id))
    .groupBy(sql`grouping sets ((${products.id}, ${products.name}), ())`)
    .orderBy(asc(products.name));

  const paidOf = (row: PurchaseRow): PurchaseRow => ({
    units: row.units,
    productAmountCents: row.productAmountCents,
    deliveryChargesCents: row.deliveryChargesCents,
    totalPaidCents: row.totalPaidCents,
  });
  return {
    rows: rows
      .filter((row) => row.isTotal === 0)
      .map((row) => ({ product: row.product, ...paidOf(row) })),
    total: paidOf(rows.filter((row) => row.isTotal === 1)[0]),
  };
}

export async function getPlanetPurchases(period: Period): Promise<Purchases> {
  const manager = await requireManagerPlanet();
  return purchases(and(eq(orders.planetId, manager.planetId), deliveredIn(period)));
}

export async function getPlanetInProgress(): Promise<Purchases> {
  const manager = await requireManagerPlanet();
  return purchases(
    and(eq(orders.planetId, manager.planetId), inArray(orders.status, IN_PROGRESS)),
  );
}

// A trip counts when it is COMPLETED. Open and cancelled trips never do.
export async function getMyEarnings(): Promise<Earnings> {
  const captain = await requireRole("captain");
  const earned = sql`coalesce(${tripEarned.earningsCents}, 0)`;
  const [row] = await db
    .select({
      trips: sql<number>`count(*)::int`,
      units: total(sql`${trips.totalUnits}`),
      earningsCents: total(earned),
      fuelCents: total(sql`${trips.fuelCostCents}`),
      profitCents: total(sql`${earned} - ${trips.fuelCostCents}`),
    })
    .from(trips)
    .leftJoin(tripEarned, eq(tripEarned.tripId, trips.id))
    .where(and(eq(trips.captainId, captain.id), eq(trips.status, "COMPLETED")));
  return row;
}
