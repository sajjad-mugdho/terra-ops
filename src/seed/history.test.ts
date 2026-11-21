import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orderEvents, orders, products, settingsChanges, trips, user } from "@/db/schema";
import { getMyOrder, listAllOrders, listQueue } from "@/features/orders/service";
import { ORDER_STATUSES, type OrderStatus } from "@/features/orders/status";
import { defaultRange } from "@/features/reports/range";
import {
  getCompanyTotals,
  getMyEarnings,
  getOverdueCount,
  getPipeline,
  getPlanetProductTable,
  getPlanetProfitSummary,
  getPlanetPurchases,
} from "@/features/reports/service";
import { getMyOpenTrip, listAvailableOrders, listMyTrips } from "@/features/trips/service";
import { TRIP_STATUSES } from "@/features/trips/status";
import { MARS_D7, placeItems } from "@/test/orders";
import { signInAll, switchTo } from "@/test/session";
import { seedHistory } from "./history";
import { EXPECTED, OLD_WATER_PRICE_CENTS } from "./history-data";
import { seedReference } from "./reference";

const ADMIRAL = "admiral@terra.demo";
const CAPTAINS = ["captain1@terra.demo", "captain2@terra.demo", "captain3@terra.demo", "captain4@terra.demo"];
const MANAGERS = ["manager.mars@terra.demo", "manager.venus@terra.demo", "manager.mercury@terra.demo"];

// The events an order must have to be in each status.
const PATH: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["PLACED"],
  REJECTED: ["PLACED", "REJECTED"],
  ACCEPTED: ["PLACED", "ACCEPTED"],
  ASSIGNED: ["PLACED", "ACCEPTED", "ASSIGNED"],
  LOADED: ["PLACED", "ACCEPTED", "ASSIGNED", "LOADED"],
  LIFTED_OFF: ["PLACED", "ACCEPTED", "ASSIGNED", "LOADED", "LIFTED_OFF"],
  LANDED: ["PLACED", "ACCEPTED", "ASSIGNED", "LOADED", "LIFTED_OFF", "LANDED"],
  AT_SECTOR: ["PLACED", "ACCEPTED", "ASSIGNED", "LOADED", "LIFTED_OFF", "LANDED", "AT_SECTOR"],
  DELIVERED: ["PLACED", "ACCEPTED", "ASSIGNED", "LOADED", "LIFTED_OFF", "LANDED", "AT_SECTOR", "DELIVERED"],
};

beforeAll(async () => {
  // Twice on purpose: the seed must be repeatable.
  await seedReference();
  await seedHistory();
  await seedReference();
  await seedHistory();
  await signInAll([ADMIRAL, ...CAPTAINS, ...MANAGERS, "customer1@terra.demo"]);
});

describe("seedHistory", () => {
  it("creates the same 32 orders on every run, in the listed statuses", async () => {
    expect(await db.$count(orders)).toBe(EXPECTED.orders);
    switchTo(ADMIRAL);
    expect((await getPipeline()).map(({ status, count }) => ({ status, count }))).toEqual(
      ORDER_STATUSES.map((status) => ({ status, count: EXPECTED.byStatus[status] })),
    );
  });

  it("has at least one order and one open trip in every status", async () => {
    for (const status of ORDER_STATUSES) expect(EXPECTED.byStatus[status]).toBeGreaterThan(0);
    for (const status of TRIP_STATUSES) expect(EXPECTED.tripsByStatus[status]).toBeGreaterThan(0);
  });

  it("has a full LOADED trip whose orders are all LOADED", async () => {
    const [loaded] = await db.select().from(trips).where(eq(trips.status, "LOADED"));
    expect(loaded.totalUnits).toBe(20);
    expect(loaded.loadedAt).not.toBeNull();
    expect(loaded.liftedOffAt).toBeNull();

    const riding = await db
      .select({ status: orders.status, totalUnits: orders.totalUnits })
      .from(orders)
      .where(eq(orders.tripId, loaded.id));
    expect(riding.map((order) => order.status)).toEqual(["LOADED", "LOADED"]);
    expect(riding.reduce((sum, order) => sum + order.totalUnits, 0)).toBe(loaded.totalUnits);

    switchTo("captain4@terra.demo");
    const mine = (await listMyTrips()).rows;
    expect(mine.map((trip) => trip.status)).toEqual(["LOADED"]);
    expect((await listAvailableOrders(loaded.id)).map((order) => order.fits)).toEqual([false]);
  });

  it("creates trips in every listed status, at most one open trip per captain", async () => {
    const rows = await db
      .select({ status: trips.status, count: sql<number>`count(*)::int` })
      .from(trips)
      .groupBy(trips.status);
    for (const status of TRIP_STATUSES) {
      expect(rows.find((row) => row.status === status)?.count ?? 0).toBe(EXPECTED.tripsByStatus[status]);
    }
  });

  it("gives the dashboard the totals worked out by hand", async () => {
    switchTo(ADMIRAL);
    const range = defaultRange();
    expect(await getCompanyTotals(range)).toEqual(EXPECTED.totals);

    const summary = await getPlanetProfitSummary(range);
    expect(summary.map(({ planet, units, revenueCents, makingCostCents, profitCents }) => ({
      planet,
      units,
      revenueCents,
      makingCostCents,
      profitCents,
    }))).toEqual(EXPECTED.planets);
    expect((await getPlanetProductTable(range)).map((planet) => planet.subtotal.profitCents)).toEqual(
      EXPECTED.planets.map((planet) => planet.profitCents),
    );
  });

  it("gives each captain the earnings worked out by hand, with a loss trip and a cancelled trip", async () => {
    const lists = [];
    for (const [index, captain] of CAPTAINS.entries()) {
      switchTo(captain);
      expect(await getMyEarnings()).toEqual(EXPECTED.captains[index]);
      lists.push((await listMyTrips()).rows);
    }
    expect(lists.slice(0, 3).every((list) => list.some((trip) => trip.status === "COMPLETED"))).toBe(true);
    expect(lists.flat().some((trip) => trip.status === "COMPLETED" && trip.profitCents === -1500)).toBe(true);
    expect(lists.flat().some((trip) => trip.status === "COMPLETED" && trip.profitCents === 5000)).toBe(true);
    expect(lists.flat().filter((trip) => trip.status === "CANCELLED")).toHaveLength(1);
  });

  it("gives every order an event for each status it went through, in time order", async () => {
    const all = await db.select({ id: orders.id, status: orders.status }).from(orders);
    for (const order of all) {
      const events = await db
        .select({ status: orderEvents.status, occurredAt: orderEvents.occurredAt })
        .from(orderEvents)
        .where(eq(orderEvents.orderId, order.id))
        .orderBy(orderEvents.seq);
      const statuses = events.map((event) => event.status);
      const times = events.map((event) => event.occurredAt.getTime());

      for (const step of PATH[order.status]) expect(statuses).toContain(step);
      expect(statuses[0]).toBe("PLACED");
      expect(statuses.at(-1)).toBe(order.status);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });

  it("shows the cancelled trip's order as removed from the trip and waiting again", async () => {
    const [returned] = await db
      .select({ orderId: orderEvents.orderId })
      .from(orderEvents)
      .where(eq(orderEvents.note, "Trip cancelled"));
    const statuses = await db
      .select({ status: orderEvents.status })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, returned.orderId))
      .orderBy(orderEvents.seq);
    expect(statuses.map((event) => event.status)).toEqual(["PLACED", "ACCEPTED", "ASSIGNED", "ACCEPTED"]);
  });

  it("has no time in the future", async () => {
    const { rows } = await db.execute<{ late: number }>(sql`
      select
        (select count(*) from orders where greatest(created_at, accepted_at, delivered_at) > now())
        + (select count(*) from trips where greatest(created_at, loaded_at, lifted_off_at, landed_at, completed_at, cancelled_at) > now())
        + (select count(*) from order_events where occurred_at > now())
        + (select count(*) from settings_changes where changed_at > now()) as late
    `);
    expect(Number(rows[0].late)).toBe(0);
  });

  it("keeps the old Water price on old orders, with the price change in the history", async () => {
    const [change] = await db
      .select({
        field: settingsChanges.field,
        oldValueCents: settingsChanges.oldValueCents,
        newValueCents: settingsChanges.newValueCents,
        actor: user.email,
        product: products.name,
      })
      .from(settingsChanges)
      .innerJoin(user, eq(user.id, settingsChanges.actorId))
      .innerJoin(products, eq(products.id, settingsChanges.productId));
    expect(change).toEqual({
      field: "price",
      oldValueCents: OLD_WATER_PRICE_CENTS,
      newValueCents: 1000,
      actor: ADMIRAL,
      product: "Water",
    });

    const { rows } = await db.execute<{ price: number; count: number }>(sql`
      select unit_price_cents as price, count(*)::int as count
      from order_items where product_name = 'Water' group by 1 order by 1
    `);
    expect(rows.map((row) => row.price)).toEqual([OLD_WATER_PRICE_CENTS, 1000]);
  });

  it("leaves a queue for a manager and a waiting order for the planning captain", async () => {
    switchTo("manager.mars@terra.demo");
    expect((await listQueue()).length).toBeGreaterThan(0);
    switchTo("manager.venus@terra.demo");
    expect((await getPlanetPurchases(defaultRange())).total).toMatchObject({ units: 35, productAmountCents: 48400 });

    switchTo("captain2@terra.demo");
    const open = ((await listMyTrips()).rows).find((trip) => trip.status === "PLANNING");
    const available = await listAvailableOrders(open?.id ?? "");
    expect(available.map((order) => order.fits).sort()).toEqual([false, true]);
  });

  it("shows the old unpicked orders as overdue, longest waiting first", async () => {
    switchTo(ADMIRAL);
    const overdue = (await listAllOrders({ overdue: true, sort: "waiting" })).rows;
    expect(overdue.map((order) => [order.destination.planet, order.status, order.totalUnits])).toEqual([
      ["Uranus", "ACCEPTED", 2],
      ["Neptune", "ACCEPTED", 1],
      ["Neptune", "ACCEPTED", 3],
      // Back from the cancelled trip: it still counts from the first accept.
      ["Jupiter", "ACCEPTED", 4],
      ["Uranus", "PLACED", 6],
    ]);
    expect(await getOverdueCount()).toEqual({ count: EXPECTED.overdueOrders });
    expect(overdue).toHaveLength(EXPECTED.overdueOrders);
  });

  it("gives the planning captain the expected profit of the open trip", async () => {
    switchTo("captain2@terra.demo");
    // Venus: 10 units at $3 earn $30, fuel $25.
    expect(await getMyOpenTrip()).toMatchObject({ status: "PLANNING", earningsCents: 3000, expectedProfitCents: 500, unitsToBreakEven: 0 });
  });

  it("continues order numbers above the seeded ones", async () => {
    const placed = await placeItems({ Water: 1 }, await MARS_D7(), "customer1@terra.demo");
    expect(placed.number).toBe(1001 + EXPECTED.orders);
    expect((await getMyOrder(placed.id)).status).toBe("PLACED");
  });
});
