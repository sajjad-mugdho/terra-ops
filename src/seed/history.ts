import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  divisions,
  orderEvents,
  orderItems,
  orders,
  planets,
  products,
  sectors,
  settingsChanges,
  trips,
  user,
} from "@/db/schema";
import type { OrderStatus } from "@/features/orders/status";
import type { TripStatus } from "@/features/trips/status";
import {
  LOOSE_ORDERS,
  OLD_WATER_PRICE_CENTS,
  type SeedOrder,
  type SeedTrip,
  TRIPS,
  WATER_PRICE_CHANGED,
} from "./history-data";

type Event = typeof orderEvents.$inferInsert & { occurredAt: Date };

const ON_TRIP: Record<Exclude<TripStatus, "COMPLETED" | "CANCELLED">, OrderStatus> = {
  PLANNING: "ASSIGNED",
  LOADED: "LOADED",
  LIFTED_OFF: "LIFTED_OFF",
  LANDED: "LANDED",
};

function statusOf(order: SeedOrder, trip?: SeedTrip): OrderStatus {
  if (order.rejected) return "REJECTED";
  if (order.delivered !== undefined) return "DELIVERED";
  if (order.atSector !== undefined) return "AT_SECTOR";
  if (trip && trip.status !== "COMPLETED" && trip.status !== "CANCELLED") return ON_TRIP[trip.status];
  return order.accepted === undefined ? "PLACED" : "ACCEPTED";
}

// Orders, trips and their events, written in their final state. Needs seedReference first.
export async function seedHistory(now: Date = new Date()) {
  const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000);
  const defined = <T>(value: T | undefined, what: string): T => {
    if (value === undefined) throw new Error(`Seed history: no ${what}`);
    return value;
  };

  const users = await db.select({ id: user.id, email: user.email }).from(user);
  const userId = (email: string) => defined(users.find((each) => each.email === email)?.id, email);
  const planetRows = await db.select().from(planets);
  const productRows = await db.select().from(products);
  const places = await db
    .select({ id: divisions.id, planetId: divisions.planetId, sector: sectors.name, division: divisions.name })
    .from(divisions)
    .innerJoin(sectors, eq(sectors.id, divisions.sectorId));

  await db.transaction(async (tx) => {
    const water = defined(productRows.find((product) => product.name === "Water"), "Water");
    await tx.insert(settingsChanges).values({
      actorId: userId("admiral@terra.demo"),
      productId: water.id,
      field: "price",
      oldValueCents: OLD_WATER_PRICE_CENTS,
      newValueCents: water.priceCents,
      changedAt: at(WATER_PRICE_CHANGED),
    });

    const events: Event[] = [];
    const queue: { order: SeedOrder; trip?: SeedTrip; tripId?: string; left?: boolean }[] =
      LOOSE_ORDERS.map((order) => ({ order }));

    // Oldest first, so trip and order numbers follow time.
    for (const trip of [...TRIPS].sort((a, b) => b.created - a.created)) {
      const planet = defined(planetRows.find((each) => each.name === trip.planet), trip.planet);
      const stamp = (hoursAgo?: number) => (hoursAgo === undefined ? null : at(hoursAgo));
      const [{ id: tripId }] = await tx
        .insert(trips)
        .values({
          captainId: userId(`captain${trip.captain}@terra.demo`),
          planetId: planet.id,
          status: trip.status,
          totalUnits: trip.orders.flatMap((order) => order.items).reduce((sum, item) => sum + item[1], 0),
          fuelCostCents: planet.fuelCostCents,
          createdAt: at(trip.created),
          loadedAt: stamp(trip.loaded),
          liftedOffAt: stamp(trip.liftedOff),
          landedAt: stamp(trip.landed),
          completedAt: stamp(trip.completed),
          cancelledAt: stamp(trip.cancelled),
        })
        .returning({ id: trips.id });
      queue.push(...trip.orders.map((order) => ({ order, trip, tripId })));
      queue.push(...(trip.returned ?? []).map((order) => ({ order, trip, tripId, left: true })));
    }

    for (const { order, trip, tripId, left } of queue.sort((a, b) => b.order.placed - a.order.placed)) {
      const place = defined(
        places.find((each) => each.sector === order.to[0] && each.division === order.to[1]),
        order.to.join(" "),
      );
      const planet = defined(planetRows.find((each) => each.id === place.planetId), "planet");
      if (trip && trip.planet !== planet.name) throw new Error(`Seed history: ${order.to[0]} is not on ${trip.planet}`);

      const customerId = userId(`customer${order.customer}@terra.demo`);
      const riding = trip && tripId && !left ? { trip, tripId } : null;
      const status = statusOf(order, riding?.trip);
      const [{ id: orderId }] = await tx
        .insert(orders)
        .values({
          idempotencyKey: randomUUID(),
          customerId,
          planetId: planet.id,
          divisionId: place.id,
          tripId: riding?.tripId ?? null,
          status,
          paymentStatus: order.rejected ? "REFUNDED" : "PAID",
          rejectReason: order.rejected?.reason ?? null,
          totalUnits: order.items.reduce((sum, item) => sum + item[1], 0),
          createdAt: at(order.placed),
          acceptedAt: order.accepted === undefined ? null : at(order.accepted),
          deliveredAt: order.delivered === undefined ? null : at(order.delivered),
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        order.items.map(([name, units, soldAtCents]) => {
          const product = defined(productRows.find((each) => each.name === name), name);
          return {
            orderId,
            productId: product.id,
            units,
            productName: product.name,
            unitPriceCents: soldAtCents ?? product.priceCents,
            unitMakingCostCents: product.makingCostCents,
            unitDeliveryChargeCents: planet.deliveryChargeCents,
          };
        }),
      );

      const add = (step: OrderStatus, hoursAgo: number | undefined, actorId: string, more: Partial<Event> = {}) => {
        if (hoursAgo !== undefined) events.push({ orderId, status: step, actorId, occurredAt: at(hoursAgo), ...more });
      };
      add("PLACED", order.placed, customerId);
      add("REJECTED", order.rejected?.at, planet.managerId, { note: order.rejected?.reason });
      add("ACCEPTED", order.accepted, planet.managerId);
      if (!trip || !tripId) continue;

      const captainId = userId(`captain${trip.captain}@terra.demo`);
      add("ASSIGNED", trip.created, captainId, { tripId });
      if (left) {
        add("ACCEPTED", trip.cancelled, captainId, { tripId, note: "Trip cancelled" });
        continue;
      }
      add("LOADED", trip.loaded, captainId, { tripId });
      add("LIFTED_OFF", trip.liftedOff, captainId, { tripId });
      add("LANDED", trip.landed, captainId, { tripId });
      add("AT_SECTOR", order.atSector, captainId, { tripId });
      add("DELIVERED", order.delivered, captainId, { tripId });
    }

    // The timeline sorts by insert order, so events go in by time.
    await tx.insert(orderEvents).values(events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()));
  });
}
