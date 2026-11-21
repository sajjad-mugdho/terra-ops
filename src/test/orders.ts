import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { divisions, orderEvents, planets, products, sectors } from "@/db/schema";
import { acceptOrder, placeOrder } from "@/features/orders/service";
import {
  addOrderToTrip,
  createTrip,
  getMyTrip,
  markLanded,
  markLiftedOff,
  markLoaded,
  markStopAtSector,
  markStopDelivered,
} from "@/features/trips/service";
import { PLANETS, PRODUCTS } from "@/seed/data";
import { switchTo } from "./session";

export const CUSTOMER = "customer1@terra.demo";
export const OTHER_CUSTOMER = "customer2@terra.demo";
export const MARS_MANAGER = "manager.mars@terra.demo";
export const VENUS_MANAGER = "manager.venus@terra.demo";
export const CAPTAIN = "captain1@terra.demo";
export const OTHER_CAPTAIN = "captain2@terra.demo";
export const ADMIRAL = "admiral@terra.demo";

export const ALL_ACTORS = [
  CUSTOMER,
  OTHER_CUSTOMER,
  MARS_MANAGER,
  VENUS_MANAGER,
  CAPTAIN,
  OTHER_CAPTAIN,
  ADMIRAL,
];

// Wipes orders and trips but keeps users, locations and products.
export async function clearOrders() {
  await db.execute(sql`truncate table order_events, order_items, orders, trips restart identity cascade`);
}

export async function productId(name: string): Promise<string> {
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.name, name));
  return row.id;
}

export async function planetId(name: string): Promise<string> {
  const [row] = await db.select({ id: planets.id }).from(planets).where(eq(planets.name, name));
  return row.id;
}

export async function divisionId(planet: string, sector: string, division: string): Promise<string> {
  const [row] = await db
    .select({ id: divisions.id })
    .from(divisions)
    .innerJoin(sectors, eq(sectors.id, divisions.sectorId))
    .innerJoin(planets, eq(planets.id, divisions.planetId))
    .where(and(eq(planets.name, planet), eq(sectors.name, sector), eq(divisions.name, division)));
  return row.id;
}

export const MARS_D7 = () => divisionId("Mars", "Olympus Sector", "Division 7");
export const MARS_D8 = () => divisionId("Mars", "Olympus Sector", "Division 8");
export const MARS_T1 = () => divisionId("Mars", "Tharsis Sector", "Division 1");
export const VENUS_D1 = () => divisionId("Venus", "Ishtar Sector", "Division 1");

// Water: $10 a unit. Delivery: Mars $5, Venus $3.
const DELIVERY_CENTS: Record<string, number> = { Mars: 500, Venus: 300 };

// Places a Water order as the main customer. Leaves that customer signed in.
export async function placeWater(units: number, division?: string, planet = "Mars") {
  switchTo(CUSTOMER);
  return placeOrder({
    divisionId: division ?? (await MARS_D7()),
    items: [{ productId: await productId("Water"), units }],
    expectedTotalCents: units * (1000 + DELIVERY_CENTS[planet]),
    idempotencyKey: randomUUID(),
  });
}

// An ACCEPTED Mars order, ready for a captain.
export async function acceptedWater(units: number, division?: string) {
  const order = await placeWater(units, division);
  switchTo(MARS_MANAGER);
  await acceptOrder(order.id);
  return order;
}

// Places an order of any products at today's prices. Leaves that customer signed in.
export async function placeItems(
  items: Record<string, number>,
  division: string,
  customer = CUSTOMER,
) {
  const [{ chargeCents }] = await db
    .select({ chargeCents: planets.deliveryChargeCents })
    .from(divisions)
    .innerJoin(planets, eq(planets.id, divisions.planetId))
    .where(eq(divisions.id, division));
  const priced = await db.select().from(products);
  const lines = Object.entries(items).map(([name, units]) => {
    const product = priced.find((each) => each.name === name);
    if (!product) throw new Error(`No product ${name}`);
    return { productId: product.id, units, priceCents: product.priceCents };
  });
  switchTo(customer);
  return placeOrder({
    divisionId: division,
    items: lines.map(({ productId, units }) => ({ productId, units })),
    expectedTotalCents: lines.reduce((sum, line) => sum + line.units * (line.priceCents + chargeCents), 0),
    idempotencyKey: randomUUID(),
  });
}

export async function acceptAs(manager: string, orderId: string) {
  switchTo(manager);
  await acceptOrder(orderId);
}

// A new trip of this captain holding the given ACCEPTED orders, still PLANNING.
export async function planTrip(captain: string, planet: string, orderIds: string[]) {
  switchTo(captain);
  const { id } = await createTrip(await planetId(planet));
  for (const orderId of orderIds) await addOrderToTrip(id, orderId);
  return id;
}

// Flies a PLANNING trip to the end: every stop delivered, trip COMPLETED.
export async function flyTrip(captain: string, tripId: string) {
  switchTo(captain);
  await markLoaded(tripId);
  await markLiftedOff(tripId);
  await markLanded(tripId);
  for (const stop of (await getMyTrip(tripId)).stops) {
    await markStopAtSector(tripId, stop.divisionId);
    await markStopDelivered(tripId, stop.divisionId);
  }
}

// Puts prices and charges back to the seed values and wipes the change history.
export async function resetSettings() {
  await db.execute(sql`truncate table settings_changes`);
  for (const { name, priceCents, makingCostCents } of PRODUCTS) {
    await db.update(products).set({ priceCents, makingCostCents }).where(eq(products.name, name));
  }
  for (const { name, deliveryChargeCents, fuelCostCents } of PLANETS) {
    await db.update(planets).set({ deliveryChargeCents, fuelCostCents }).where(eq(planets.name, name));
  }
}

// Moves an order's clocks into the past, in minutes, so a test can stand on the 3 day line.
export async function backdate(orderId: string, placedMinutes: number, acceptedMinutes = placedMinutes) {
  await db.transaction(async (tx) => {
    // created_at is frozen by a trigger. Only a test may step around it.
    await tx.execute(sql`alter table orders disable trigger orders_frozen_columns`);
    await tx.execute(sql`
      update orders set
        created_at = now() - make_interval(mins => ${placedMinutes}),
        accepted_at = case when accepted_at is null then null
          else now() - make_interval(mins => ${acceptedMinutes}) end
      where id = ${orderId}
    `);
    await tx.execute(sql`alter table orders enable trigger orders_frozen_columns`);
  });
}

export async function timeline(orderId: string) {
  return db
    .select({ status: orderEvents.status, note: orderEvents.note, tripId: orderEvents.tripId })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(orderEvents.seq);
}

// Every key of a value, at any depth. Used to prove a DTO hides a field.
export function deepKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(deepKeys);
  if (value === null || typeof value !== "object" || value instanceof Date) return [];
  return Object.entries(value).flatMap(([key, inner]) => [key, ...deepKeys(inner)]);
}
