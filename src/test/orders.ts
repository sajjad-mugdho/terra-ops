import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { divisions, orderEvents, planets, products, sectors } from "@/db/schema";
import { acceptOrder, placeOrder } from "@/features/orders/service";
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
