import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orderEvents, orderItems, orders, trips, user } from "@/db/schema";
import { seedReference } from "@/seed/reference";
import { clearOrders, divisionId, planetId, productId } from "@/test/orders";

const CHECK = "23514";
const UNIQUE = "23505";
const FOREIGN_KEY = "23503";
const RESTRICT = "23001";

const rejected = (code: string, constraint: string) => ({ cause: { code, constraint } });

// Safely after created_at, whatever the gap between this clock and the database clock.
const later = () => new Date(Date.now() + 60_000);

const userId = async (email: string) =>
  (await db.select({ id: user.id }).from(user).where(eq(user.email, email)))[0].id;

async function newOrder(values: Partial<typeof orders.$inferInsert> = {}) {
  const [row] = await db
    .insert(orders)
    .values({
      idempotencyKey: randomUUID(),
      customerId: await userId("customer1@terra.demo"),
      planetId: await planetId("Mars"),
      divisionId: await divisionId("Mars", "Olympus Sector", "Division 7"),
      totalUnits: 3,
      ...values,
    })
    .returning();
  return row;
}

async function newTrip(values: Partial<typeof trips.$inferInsert> = {}) {
  const [row] = await db
    .insert(trips)
    .values({
      captainId: await userId("captain1@terra.demo"),
      planetId: await planetId("Mars"),
      fuelCostCents: 4000,
      ...values,
    })
    .returning();
  return row;
}

async function newItem(orderId: string, units = 3) {
  return db.insert(orderItems).values({
    orderId,
    productId: await productId("Water"),
    units,
    productName: "Water",
    unitPriceCents: 1000,
    unitMakingCostCents: 600,
    unitDeliveryChargeCents: 500,
  });
}

beforeAll(seedReference);
beforeEach(clearOrders);

describe("orders", () => {
  it.each([0, -1, 21])("rejects total_units = %i", async (totalUnits) => {
    await expect(newOrder({ totalUnits })).rejects.toMatchObject(
      rejected(CHECK, "orders_total_units_range"),
    );
  });

  it.each([1, 20])("accepts total_units = %i", async (totalUnits) => {
    expect((await newOrder({ totalUnits })).status).toBe("PLACED");
  });

  it("numbers orders from 1001", async () => {
    expect((await newOrder()).number).toBe(1001);
    expect((await newOrder()).number).toBe(1002);
  });

  it("rejects REJECTED without REFUNDED, and REFUNDED without REJECTED", async () => {
    const check = rejected(CHECK, "orders_rejected_is_refunded");
    await expect(newOrder({ status: "REJECTED", rejectReason: "No" })).rejects.toMatchObject(check);
    await expect(newOrder({ paymentStatus: "REFUNDED" })).rejects.toMatchObject(check);
  });

  it("rejects REJECTED without a reason, and a reason on an order that is not rejected", async () => {
    const check = rejected(CHECK, "orders_reject_reason_matches_status");
    await expect(newOrder({ status: "REJECTED", paymentStatus: "REFUNDED" })).rejects.toMatchObject(check);
    await expect(newOrder({ rejectReason: "Why" })).rejects.toMatchObject(check);
  });

  it("rejects a trip on an order that is still PLACED", async () => {
    const trip = await newTrip();
    await expect(newOrder({ tripId: trip.id })).rejects.toMatchObject(
      rejected(CHECK, "orders_trip_matches_status"),
    );
  });

  it("rejects ASSIGNED without a trip", async () => {
    await expect(newOrder({ status: "ASSIGNED", acceptedAt: later() })).rejects.toMatchObject(
      rejected(CHECK, "orders_trip_matches_status"),
    );
  });

  it("rejects ACCEPTED without accepted_at and DELIVERED without delivered_at", async () => {
    await expect(newOrder({ status: "ACCEPTED" })).rejects.toMatchObject(
      rejected(CHECK, "orders_accepted_at_matches_status"),
    );
    const order = await newOrder();
    await expect(
      db.update(orders).set({ deliveredAt: sql`now()` }).where(eq(orders.id, order.id)),
    ).rejects.toMatchObject(rejected(CHECK, "orders_delivered_at_matches_status"));
  });

  it("rejects a division of another planet", async () => {
    const venusDivision = await divisionId("Venus", "Ishtar Sector", "Division 1");
    await expect(newOrder({ divisionId: venusDivision })).rejects.toMatchObject(
      rejected(FOREIGN_KEY, "orders_division_planet_fk"),
    );
  });

  it("rejects the same idempotency key twice for one customer, allows it for another", async () => {
    const idempotencyKey = randomUUID();
    await newOrder({ idempotencyKey });
    await expect(newOrder({ idempotencyKey })).rejects.toMatchObject(
      rejected(UNIQUE, "orders_customer_idempotency_unique"),
    );
    const other = await newOrder({ idempotencyKey, customerId: await userId("customer2@terra.demo") });
    expect(other.idempotencyKey).toBe(idempotencyKey);
  });

  it("never lets units, customer or destination change, and never deletes an order", async () => {
    const order = await newOrder();
    await expect(
      db.update(orders).set({ totalUnits: 5 }).where(eq(orders.id, order.id)),
    ).rejects.toMatchObject(rejected(RESTRICT, "orders_frozen_columns"));
    await expect(
      db.update(orders).set({ customerId: await userId("customer2@terra.demo") }).where(eq(orders.id, order.id)),
    ).rejects.toMatchObject(rejected(RESTRICT, "orders_frozen_columns"));
    await expect(db.delete(orders).where(eq(orders.id, order.id))).rejects.toMatchObject(
      rejected(RESTRICT, "orders_no_delete"),
    );
  });
});

describe("order_items", () => {
  it.each([0, -1, 21])("rejects units = %i", async (units) => {
    const order = await newOrder();
    await expect(newItem(order.id, units)).rejects.toMatchObject(
      rejected(CHECK, "order_items_units_range"),
    );
  });

  it("rejects the same product twice on one order", async () => {
    const order = await newOrder();
    await newItem(order.id);
    await expect(newItem(order.id)).rejects.toMatchObject(
      rejected(UNIQUE, "order_items_order_product_unique"),
    );
  });

  it("never lets a frozen price change or a line disappear", async () => {
    const order = await newOrder();
    await newItem(order.id);
    const frozen = rejected(RESTRICT, "order_items_append_only");
    await expect(db.update(orderItems).set({ unitPriceCents: 1 })).rejects.toMatchObject(frozen);
    await expect(db.update(orderItems).set({ unitMakingCostCents: 1 })).rejects.toMatchObject(frozen);
    await expect(db.delete(orderItems)).rejects.toMatchObject(frozen);
  });
});

describe("order_events", () => {
  const event = async (orderId: string, status: "PLACED" | "ACCEPTED") =>
    db.insert(orderEvents).values({ orderId, status, actorId: await userId("customer1@terra.demo") });

  it("is append-only", async () => {
    const order = await newOrder();
    await event(order.id, "PLACED");
    const frozen = rejected(RESTRICT, "order_events_append_only");
    await expect(db.update(orderEvents).set({ note: "edited" })).rejects.toMatchObject(frozen);
    await expect(db.delete(orderEvents)).rejects.toMatchObject(frozen);
  });

  it("rejects a second PLACED event but allows ACCEPTED to repeat", async () => {
    const order = await newOrder();
    await event(order.id, "PLACED");
    await expect(event(order.id, "PLACED")).rejects.toMatchObject(
      rejected(UNIQUE, "order_events_once_per_status"),
    );
    await event(order.id, "ACCEPTED");
    await event(order.id, "ACCEPTED");
    expect(await db.$count(orderEvents)).toBe(3);
  });
});

describe("trips", () => {
  it.each([-1, 21])("rejects total_units = %i", async (totalUnits) => {
    await expect(newTrip({ totalUnits })).rejects.toMatchObject(
      rejected(CHECK, "trips_total_units_range"),
    );
  });

  it("rejects a unit count that its orders do not add up to", async () => {
    await expect(newTrip({ totalUnits: 5 })).rejects.toMatchObject(
      rejected(CHECK, "trips_total_units_matches_orders"),
    );
  });

  it("rejects a second open trip for one captain", async () => {
    await newTrip();
    await expect(newTrip()).rejects.toMatchObject(rejected(UNIQUE, "trips_one_open_per_captain"));
  });

  it("numbers trips from 101", async () => {
    expect((await newTrip()).number).toBe(101);
  });

  it("rejects loading an empty trip", async () => {
    const trip = await newTrip();
    await expect(
      db.update(trips).set({ status: "LOADED", loadedAt: sql`now()` }).where(eq(trips.id, trip.id)),
    ).rejects.toMatchObject(rejected(CHECK, "trips_not_empty_after_planning"));
  });

  it("rejects a status without its timestamp", async () => {
    const trip = await newTrip();
    await expect(
      db.update(trips).set({ status: "CANCELLED" }).where(eq(trips.id, trip.id)),
    ).rejects.toMatchObject(rejected(CHECK, "trips_cancelled_at_matches_status"));
  });

  it("never lets the fuel cost or the captain change, and never deletes a trip", async () => {
    const trip = await newTrip();
    const frozen = rejected(RESTRICT, "trips_frozen_columns");
    await expect(
      db.update(trips).set({ fuelCostCents: 1 }).where(eq(trips.id, trip.id)),
    ).rejects.toMatchObject(frozen);
    await expect(
      db.update(trips).set({ captainId: await userId("captain2@terra.demo") }).where(eq(trips.id, trip.id)),
    ).rejects.toMatchObject(frozen);
    await expect(db.delete(trips).where(eq(trips.id, trip.id))).rejects.toMatchObject(
      rejected(RESTRICT, "trips_no_delete"),
    );
  });

  it("rejects an order put on a trip without raising the trip's units", async () => {
    const trip = await newTrip();
    const order = await newOrder({ status: "ACCEPTED", acceptedAt: later() });
    await expect(
      db.update(orders).set({ tripId: trip.id, status: "ASSIGNED" }).where(eq(orders.id, order.id)),
    ).rejects.toMatchObject(rejected(CHECK, "trips_total_units_matches_orders"));
  });

  it("rejects an order whose status does not fit its trip", async () => {
    const trip = await newTrip();
    const order = await newOrder({ status: "ACCEPTED", acceptedAt: later() });
    const move = db.transaction(async (tx) => {
      await tx.update(trips).set({ totalUnits: 3 }).where(eq(trips.id, trip.id));
      await tx.update(orders).set({ tripId: trip.id, status: "LOADED" }).where(eq(orders.id, order.id));
    });
    await expect(move).rejects.toMatchObject(rejected(CHECK, "trips_order_status_matches_trip"));
  });

  it("rejects an order of another planet on the trip", async () => {
    const trip = await newTrip({ planetId: await planetId("Venus") });
    const order = await newOrder({ status: "ACCEPTED", acceptedAt: later() });
    await expect(
      db.update(orders).set({ tripId: trip.id, status: "ASSIGNED" }).where(eq(orders.id, order.id)),
    ).rejects.toMatchObject(rejected(FOREIGN_KEY, "orders_trip_planet_fk"));
  });
});
