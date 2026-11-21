import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orders, planets, trips } from "@/db/schema";
import { getMyOrder, rejectOrder } from "@/features/orders/service";
import { updatePlanetCharges } from "@/features/settings/service";
import { seedReference } from "@/seed/reference";
import {
  acceptAs,
  acceptedWater,
  ADMIRAL,
  ALL_ACTORS,
  backdate,
  CAPTAIN,
  clearOrders,
  CUSTOMER,
  deepKeys,
  flyTrip,
  MARS_D7,
  MARS_D8,
  MARS_MANAGER,
  MARS_T1,
  OTHER_CAPTAIN,
  placeItems,
  placeWater,
  planetId,
  planTrip,
  resetSettings,
  timeline,
  VENUS_D1,
  VENUS_MANAGER,
} from "@/test/orders";
import { actAsNobody, signInAll, switchTo } from "@/test/session";
import {
  addOrderToTrip,
  cancelTrip,
  createTrip,
  getAnyTrip,
  getMyOpenTrip,
  getMyTrip,
  getMyTripRow,
  listAllTrips,
  listAvailableOrders,
  listMyTrips,
  listPlanetsForTrip,
  markLanded,
  markLiftedOff,
  markLoaded,
  markStopAtSector,
  markStopDelivered,
  removeOrderFromTrip,
} from "./service";

beforeAll(async () => {
  await seedReference();
  await signInAll(ALL_ACTORS);
});

beforeEach(clearOrders);

async function marsTrip(captain = CAPTAIN) {
  const mars = await planetId("Mars");
  switchTo(captain);
  return (await createTrip(mars)).id;
}

// A Mars trip of the main captain holding the given orders, still PLANNING.
async function tripWith(...orderIds: string[]) {
  const tripId = await marsTrip();
  for (const orderId of orderIds) await addOrderToTrip(tripId, orderId);
  return tripId;
}

async function landedTrip(...orderIds: string[]) {
  const tripId = await tripWith(...orderIds);
  await markLoaded(tripId);
  await markLiftedOff(tripId);
  await markLanded(tripId);
  return tripId;
}

const tripRow = async (id: string) => (await db.select().from(trips).where(eq(trips.id, id)))[0];
const orderRow = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0];
const statuses = async (id: string) => (await timeline(id)).map((event) => event.status);

describe("listPlanetsForTrip", () => {
  it("lists every planet with its fuel cost and the orders that wait", async () => {
    await acceptedWater(3);
    await acceptedWater(4);
    await placeWater(5);

    switchTo(CAPTAIN);
    const list = await listPlanetsForTrip();
    expect(list).toHaveLength(7);
    expect(list.find((planet) => planet.name === "Mars")).toMatchObject({
      daysFromEarth: 4,
      fuelCostCents: 4000,
      waitingOrders: 2,
      waitingUnits: 7,
    });
    expect(list.find((planet) => planet.name === "Venus")).toMatchObject({
      waitingOrders: 0,
      waitingUnits: 0,
    });
  });

  it("stops counting an order once it is on a trip", async () => {
    const order = await acceptedWater(3);
    await tripWith(order.id);
    const mars = (await listPlanetsForTrip()).find((planet) => planet.name === "Mars");
    expect(mars).toMatchObject({ waitingOrders: 0, waitingUnits: 0 });
  });

  it.each([CUSTOMER, MARS_MANAGER, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    switchTo(email);
    await expect(listPlanetsForTrip()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("createTrip", () => {
  it("opens a PLANNING trip and freezes the planet's fuel cost", async () => {
    const tripId = await marsTrip();
    expect(await tripRow(tripId)).toMatchObject({
      number: 101,
      status: "PLANNING",
      totalUnits: 0,
      fuelCostCents: 4000,
    });

    await db.update(planets).set({ fuelCostCents: 9900 }).where(eq(planets.name, "Mars"));
    try {
      expect((await getMyOpenTrip())?.fuelCostCents).toBe(4000);
    } finally {
      await db.update(planets).set({ fuelCostCents: 4000 }).where(eq(planets.name, "Mars"));
    }
  });

  it("refuses a second open trip, also when two are started at the same moment", async () => {
    const mars = await planetId("Mars");
    const venus = await planetId("Venus");
    await marsTrip();
    await expect(createTrip(venus)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "You already have an open trip",
    });

    await clearOrders();
    switchTo(CAPTAIN);
    const results = await Promise.allSettled([createTrip(mars), createTrip(venus)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await db.$count(trips)).toBe(1);
  });

  it("lets two captains each have their own trip", async () => {
    const first = await marsTrip(CAPTAIN);
    const second = await marsTrip(OTHER_CAPTAIN);
    expect(second).not.toBe(first);
  });

  it.each([randomUUID(), "mars"])("refuses the unknown planet %s", async (id) => {
    switchTo(CAPTAIN);
    await expect(createTrip(id)).rejects.toMatchObject({ code: "INVALID" });
  });

  it.each([CUSTOMER, MARS_MANAGER, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    const mars = await planetId("Mars");
    switchTo(email);
    await expect(createTrip(mars)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("is UNAUTHORIZED without a session", async () => {
    actAsNobody();
    await expect(createTrip(randomUUID())).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("listAvailableOrders", () => {
  it("shows ACCEPTED orders of the trip's planet that are on no trip", async () => {
    const free = await acceptedWater(3);
    const taken = await acceptedWater(2);
    await placeWater(1);
    const rejected = await placeWater(1);
    switchTo(MARS_MANAGER);
    await rejectOrder(rejected.id, "Out of stock");
    const venus = await placeWater(1, await VENUS_D1(), "Venus");
    switchTo(VENUS_MANAGER);
    const { acceptOrder } = await import("@/features/orders/service");
    await acceptOrder(venus.id);

    const tripId = await tripWith(taken.id);
    const available = await listAvailableOrders(tripId);
    expect(available.map((order) => order.id)).toEqual([free.id]);
    expect(available[0]).toEqual({
      id: free.id,
      number: free.number,
      divisionId: await MARS_D7(),
      sector: "Olympus Sector",
      division: "Division 7",
      items: [{ product: "Water", units: 3 }],
      totalUnits: 3,
      deliveryChargesCents: 1500,
      waitingSince: (await orderRow(free.id)).acceptedAt,
      fits: true,
    });
  });

  it("marks an order that does not fit in the space left", async () => {
    const big = await acceptedWater(15);
    const tooBig = await acceptedWater(6);
    const exact = await acceptedWater(5);
    const tripId = await tripWith(big.id);

    const available = await listAvailableOrders(tripId);
    expect(available.find((order) => order.id === tooBig.id)?.fits).toBe(false);
    expect(available.find((order) => order.id === exact.id)?.fits).toBe(true);
  });

  it("is empty when no accepted order waits for the planet", async () => {
    const tripId = await marsTrip();
    expect(await listAvailableOrders(tripId)).toEqual([]);
  });

  it("answers NOT_FOUND for another captain's trip", async () => {
    const tripId = await marsTrip(CAPTAIN);
    switchTo(OTHER_CAPTAIN);
    await expect(listAvailableOrders(tripId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(listAvailableOrders("abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("gives the captain products and units, never a price, a cost or the customer", async () => {
    const onTrip = await acceptedWater(3);
    await acceptedWater(2);
    const tripId = await tripWith(onTrip.id);

    const data = [await listAvailableOrders(tripId), await getMyOpenTrip(), await listPlanetsForTrip()];
    const keys = deepKeys(data);
    expect(keys).toContain("product");
    expect(keys).toContain("units");
    // expectedProfitCents is the captain's own trip profit (slice 3.1), not company profit.
    const hidden = keys.filter((key) => /price|makingcost|profit|customer|total(?!Units)cents/i.test(key));
    expect(hidden).toEqual(["expectedProfitCents"]);
    expect(JSON.stringify(data)).not.toContain("Mira Chen");
  });
});

describe("addOrderToTrip", () => {
  it("moves the order to ASSIGNED, raises the units and adds an event", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);

    expect(await orderRow(order.id)).toMatchObject({ status: "ASSIGNED", tripId });
    expect((await tripRow(tripId)).totalUnits).toBe(3);
    expect(await timeline(order.id)).toEqual([
      { status: "PLACED", note: null, tripId: null },
      { status: "ACCEPTED", note: null, tripId: null },
      { status: "ASSIGNED", note: null, tripId },
    ]);

    switchTo(CUSTOMER);
    const tracked = await getMyOrder(order.id);
    expect(tracked.timeline.at(-1)?.label).toBe("Assigned to a ship");
    expect(tracked.trip).toMatchObject({ number: 101, liftedOffAt: null });
  });

  it("fills a trip with one order of exactly 20 units", async () => {
    const order = await acceptedWater(20);
    const tripId = await tripWith(order.id);
    expect((await tripRow(tripId)).totalUnits).toBe(20);
  });

  it("gives the order to exactly one of two captains who add it at the same moment", async () => {
    const order = await acceptedWater(3);
    const first = await marsTrip(CAPTAIN);
    const second = await marsTrip(OTHER_CAPTAIN);

    switchTo(CAPTAIN);
    const one = addOrderToTrip(first, order.id);
    switchTo(OTHER_CAPTAIN);
    const two = addOrderToTrip(second, order.id);
    const results = await Promise.allSettled([one, two]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT", message: "This order was just taken by another captain" },
    });

    const winner = results[0].status === "fulfilled" ? first : second;
    const loser = winner === first ? second : first;
    expect(await orderRow(order.id)).toMatchObject({ status: "ASSIGNED", tripId: winner });
    expect((await tripRow(winner)).totalUnits).toBe(3);
    expect((await tripRow(loser)).totalUnits).toBe(0);
    expect(await statuses(order.id)).toEqual(["PLACED", "ACCEPTED", "ASSIGNED"]);
  });

  it("never passes 20 units when two adds arrive at the same moment", async () => {
    const base = await acceptedWater(10);
    const left = await acceptedWater(6);
    const right = await acceptedWater(6);
    const tripId = await tripWith(base.id);

    const results = await Promise.allSettled([
      addOrderToTrip(tripId, left.id),
      addOrderToTrip(tripId, right.id),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT", message: "Not enough space" },
    });
    expect((await tripRow(tripId)).totalUnits).toBe(16);
    expect(await db.$count(orders, eq(orders.tripId, tripId))).toBe(2);
  });

  it("keeps the count right when many adds race for the last space", async () => {
    const candidates = [];
    for (let index = 0; index < 6; index += 1) candidates.push(await acceptedWater(5));
    const tripId = await marsTrip();

    const results = await Promise.allSettled(
      candidates.map((order) => addOrderToTrip(tripId, order.id)),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(4);
    expect((await tripRow(tripId)).totalUnits).toBe(20);
    expect(await db.$count(orders, eq(orders.tripId, tripId))).toBe(4);
  });

  it("refuses an order that does not fit", async () => {
    const big = await acceptedWater(15);
    const tooBig = await acceptedWater(6);
    const tripId = await tripWith(big.id);
    await expect(addOrderToTrip(tripId, tooBig.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Not enough space",
    });
    expect(await orderRow(tooBig.id)).toMatchObject({ status: "ACCEPTED", tripId: null });
  });

  it("refuses an order of another planet with INVALID and reserves no space", async () => {
    const venus = await placeWater(2, await VENUS_D1(), "Venus");
    switchTo(VENUS_MANAGER);
    const { acceptOrder } = await import("@/features/orders/service");
    await acceptOrder(venus.id);

    const tripId = await marsTrip();
    await expect(addOrderToTrip(tripId, venus.id)).rejects.toMatchObject({ code: "INVALID" });
    expect((await tripRow(tripId)).totalUnits).toBe(0);
    expect(await orderRow(venus.id)).toMatchObject({ status: "ACCEPTED", tripId: null });
  });

  it("refuses an order that is PLACED, REJECTED or already on a trip", async () => {
    const placed = await placeWater(1);
    const rejected = await placeWater(1);
    switchTo(MARS_MANAGER);
    await rejectOrder(rejected.id, "Out of stock");
    const assigned = await acceptedWater(1);

    const tripId = await tripWith(assigned.id);
    for (const id of [placed.id, rejected.id, assigned.id]) {
      await expect(addOrderToTrip(tripId, id)).rejects.toMatchObject({ code: "CONFLICT" });
    }
    expect((await tripRow(tripId)).totalUnits).toBe(1);
    expect(await statuses(assigned.id)).toEqual(["PLACED", "ACCEPTED", "ASSIGNED"]);
  });

  it("answers NOT_FOUND for another captain's trip and for unknown IDs", async () => {
    const order = await acceptedWater(1);
    const tripId = await marsTrip(CAPTAIN);
    switchTo(OTHER_CAPTAIN);
    await expect(addOrderToTrip(tripId, order.id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    switchTo(CAPTAIN);
    await expect(addOrderToTrip(tripId, randomUUID())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(addOrderToTrip(randomUUID(), order.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(addOrderToTrip("abc", "def")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await orderRow(order.id)).toMatchObject({ status: "ACCEPTED", tripId: null });
  });

  it.each([CUSTOMER, MARS_MANAGER, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    const order = await acceptedWater(1);
    const tripId = await marsTrip();
    switchTo(email);
    await expect(addOrderToTrip(tripId, order.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeOrderFromTrip(tripId, order.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(cancelTrip(tripId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(markLoaded(tripId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("removeOrderFromTrip", () => {
  it("returns the order to ACCEPTED, lowers the units and frees it for every captain", async () => {
    const order = await acceptedWater(3);
    const keep = await acceptedWater(2);
    const tripId = await tripWith(order.id, keep.id);
    await removeOrderFromTrip(tripId, order.id);

    expect(await orderRow(order.id)).toMatchObject({ status: "ACCEPTED", tripId: null });
    expect((await tripRow(tripId)).totalUnits).toBe(2);
    expect((await timeline(order.id)).at(-1)).toEqual({
      status: "ACCEPTED",
      note: "Removed from trip",
      tripId,
    });

    const other = await marsTrip(OTHER_CAPTAIN);
    expect((await listAvailableOrders(other)).map((each) => each.id)).toEqual([order.id]);
    await addOrderToTrip(other, order.id);
    expect(await orderRow(order.id)).toMatchObject({ status: "ASSIGNED", tripId: other });
  });

  it("shows the customer all three events when an order changes ship", async () => {
    const order = await acceptedWater(3);
    const first = await tripWith(order.id);
    await removeOrderFromTrip(first, order.id);
    const second = await marsTrip(OTHER_CAPTAIN);
    await addOrderToTrip(second, order.id);

    switchTo(CUSTOMER);
    const tracked = await getMyOrder(order.id);
    expect(tracked.timeline.map((event) => event.label)).toEqual([
      "Order placed",
      "Accepted by planet",
      "Assigned to a ship",
      "Removed from trip",
      "Assigned to a ship",
    ]);
    expect(tracked.trip?.number).toBe(102);
  });

  it("answers NOT_FOUND for an order that is not in the trip", async () => {
    const outside = await acceptedWater(3);
    const tripId = await marsTrip();
    await expect(removeOrderFromTrip(tripId, outside.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeOrderFromTrip(tripId, randomUUID())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeOrderFromTrip(tripId, "abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("answers NOT_FOUND for another captain's trip", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    switchTo(OTHER_CAPTAIN);
    await expect(removeOrderFromTrip(tripId, order.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await orderRow(order.id)).toMatchObject({ status: "ASSIGNED", tripId });
  });

  it("removes once when the button is clicked twice at the same moment", async () => {
    const order = await acceptedWater(3);
    const keep = await acceptedWater(2);
    const tripId = await tripWith(order.id, keep.id);

    const results = await Promise.allSettled([
      removeOrderFromTrip(tripId, order.id),
      removeOrderFromTrip(tripId, order.id),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await tripRow(tripId)).totalUnits).toBe(2);
    expect(await statuses(order.id)).toEqual(["PLACED", "ACCEPTED", "ASSIGNED", "ACCEPTED"]);
  });
});

describe("cancelTrip", () => {
  it("returns every order to ACCEPTED with an event and marks the trip CANCELLED", async () => {
    const first = await acceptedWater(3);
    const second = await acceptedWater(4);
    const tripId = await tripWith(first.id, second.id);
    await cancelTrip(tripId);

    const trip = await tripRow(tripId);
    expect(trip).toMatchObject({ status: "CANCELLED", totalUnits: 0 });
    expect(trip.cancelledAt).toBeInstanceOf(Date);
    for (const order of [first, second]) {
      expect(await orderRow(order.id)).toMatchObject({ status: "ACCEPTED", tripId: null });
      expect((await timeline(order.id)).at(-1)).toEqual({
        status: "ACCEPTED",
        note: "Trip cancelled",
        tripId,
      });
    }
    expect(await getMyOpenTrip()).toBeNull();
  });

  it("frees the orders for other captains and lets the captain start again", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    await cancelTrip(tripId);

    const next = await marsTrip(CAPTAIN);
    expect(next).not.toBe(tripId);
    const other = await marsTrip(OTHER_CAPTAIN);
    await addOrderToTrip(other, order.id);
    expect(await orderRow(order.id)).toMatchObject({ status: "ASSIGNED", tripId: other });
  });

  it("allows cancelling an empty trip", async () => {
    const tripId = await marsTrip();
    await cancelTrip(tripId);
    expect((await tripRow(tripId)).status).toBe("CANCELLED");
  });

  it("refuses a second cancel", async () => {
    const tripId = await marsTrip();
    await cancelTrip(tripId);
    await expect(cancelTrip(tripId)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("answers NOT_FOUND for another captain's trip", async () => {
    const tripId = await marsTrip(CAPTAIN);
    switchTo(OTHER_CAPTAIN);
    await expect(cancelTrip(tripId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await tripRow(tripId)).status).toBe("PLANNING");
  });
});

describe("after the trip is loaded", () => {
  it("refuses add, remove and cancel", async () => {
    const order = await acceptedWater(3);
    const late = await acceptedWater(2);
    const tripId = await tripWith(order.id);
    await markLoaded(tripId);

    const locked = { code: "CONFLICT", message: "The trip is already loaded" };
    await expect(addOrderToTrip(tripId, late.id)).rejects.toMatchObject(locked);
    await expect(removeOrderFromTrip(tripId, order.id)).rejects.toMatchObject(locked);
    await expect(cancelTrip(tripId)).rejects.toMatchObject(locked);

    expect(await tripRow(tripId)).toMatchObject({ status: "LOADED", totalUnits: 3 });
    expect(await orderRow(order.id)).toMatchObject({ status: "LOADED", tripId });
    expect(await orderRow(late.id)).toMatchObject({ status: "ACCEPTED", tripId: null });
  });
});

describe("markLoaded, markLiftedOff, markLanded", () => {
  it("moves the trip and every order together, with one event per order", async () => {
    const first = await acceptedWater(3);
    const second = await acceptedWater(4, await MARS_T1());
    const tripId = await tripWith(first.id, second.id);

    const steps = [
      [markLoaded, "LOADED", "loadedAt"],
      [markLiftedOff, "LIFTED_OFF", "liftedOffAt"],
      [markLanded, "LANDED", "landedAt"],
    ] as const;
    for (const [mark, status, column] of steps) {
      await mark(tripId);
      const trip = await tripRow(tripId);
      expect(trip.status).toBe(status);
      expect(trip[column]).toBeInstanceOf(Date);
      for (const order of [first, second]) {
        expect((await orderRow(order.id)).status).toBe(status);
        expect((await timeline(order.id)).at(-1)).toEqual({ status, note: null, tripId });
      }
    }

    expect(await statuses(first.id)).toEqual([
      "PLACED",
      "ACCEPTED",
      "ASSIGNED",
      "LOADED",
      "LIFTED_OFF",
      "LANDED",
    ]);
  });

  it("never lets an order run ahead of or behind its trip", async () => {
    const first = await acceptedWater(3);
    const second = await acceptedWater(4);
    const tripId = await tripWith(first.id, second.id);

    for (const mark of [markLoaded, markLiftedOff, markLanded]) {
      await mark(tripId);
      const trip = await tripRow(tripId);
      const onTrip = await db.select().from(orders).where(eq(orders.tripId, tripId));
      expect(onTrip).toHaveLength(2);
      expect(onTrip.every((order) => order.status === trip.status)).toBe(true);
    }
  });

  it("refuses to load an empty trip", async () => {
    const tripId = await marsTrip();
    await expect(markLoaded(tripId)).rejects.toMatchObject({
      code: "INVALID",
      message: "Add at least one order",
    });
    expect((await tripRow(tripId)).status).toBe("PLANNING");
  });

  it("refuses a skipped step", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    await expect(markLiftedOff(tripId)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(markLanded(tripId)).rejects.toMatchObject({ code: "CONFLICT" });

    await markLoaded(tripId);
    await expect(markLanded(tripId)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await tripRow(tripId)).toMatchObject({ status: "LOADED", liftedOffAt: null, landedAt: null });
    expect((await orderRow(order.id)).status).toBe("LOADED");
  });

  it("answers Already done on a second click and writes no second event", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);

    for (const mark of [markLoaded, markLiftedOff, markLanded]) {
      await mark(tripId);
      const before = await tripRow(tripId);
      await expect(mark(tripId)).rejects.toMatchObject({ code: "CONFLICT", message: "Already done" });
      const after = await tripRow(tripId);
      expect(after.status).toBe(before.status);
      expect(after.loadedAt).toEqual(before.loadedAt);
      expect(after.liftedOffAt).toEqual(before.liftedOffAt);
      expect(after.landedAt).toEqual(before.landedAt);
    }
    expect(await timeline(order.id)).toHaveLength(6);
  });

  it("applies a step once when it is clicked twice at the same moment", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    const results = await Promise.allSettled([markLoaded(tripId), markLoaded(tripId)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await statuses(order.id)).toEqual(["PLACED", "ACCEPTED", "ASSIGNED", "LOADED"]);
  });

  it("answers NOT_FOUND for another captain's trip", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    switchTo(OTHER_CAPTAIN);
    for (const mark of [markLoaded, markLiftedOff, markLanded]) {
      await expect(mark(tripId)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(mark("abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect((await tripRow(tripId)).status).toBe("PLANNING");
  });

  it("lets the captain land right away: there is no time gate", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    await markLoaded(tripId);
    await markLiftedOff(tripId);
    await markLanded(tripId);
    expect((await tripRow(tripId)).status).toBe("LANDED");
  });

  it("gives the customer the trip and the lift-off time for the ETA", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    await markLoaded(tripId);
    await markLiftedOff(tripId);
    const liftedOffAt = (await tripRow(tripId)).liftedOffAt;

    switchTo(CUSTOMER);
    const tracked = await getMyOrder(order.id);
    expect(tracked.trip).toEqual({ number: 101, liftedOffAt, landedAt: null });
    expect(tracked.daysFromEarth).toBe(4);
    expect(tracked.timeline.at(-1)?.label).toBe("Lifted off from Earth");

    switchTo(CAPTAIN);
    await markLanded(tripId);
    switchTo(CUSTOMER);
    expect((await getMyOrder(order.id)).timeline.at(-1)?.label).toBe("Landed on Mars");
  });
});

describe("delivering stops", () => {
  it("completes a one-stop trip on the stop's second step", async () => {
    const order = await acceptedWater(3);
    const tripId = await landedTrip(order.id);
    const d7 = await MARS_D7();

    await markStopAtSector(tripId, d7);
    expect((await orderRow(order.id)).status).toBe("AT_SECTOR");
    expect((await tripRow(tripId)).status).toBe("LANDED");

    await expect(markStopDelivered(tripId, d7)).resolves.toEqual({ completed: true });
    const delivered = await orderRow(order.id);
    expect(delivered.status).toBe("DELIVERED");
    expect(delivered.deliveredAt).toBeInstanceOf(Date);
    const trip = await tripRow(tripId);
    expect(trip.status).toBe("COMPLETED");
    expect(trip.completedAt).toBeInstanceOf(Date);
    expect(await getMyOpenTrip()).toBeNull();
  });

  it("moves every order of a division together and leaves the other stops alone", async () => {
    const first = await acceptedWater(3, await MARS_D7());
    const second = await acceptedWater(2, await MARS_D7());
    const other = await acceptedWater(4, await MARS_D8());
    const tripId = await landedTrip(first.id, second.id, other.id);

    await markStopAtSector(tripId, await MARS_D7());
    expect((await orderRow(first.id)).status).toBe("AT_SECTOR");
    expect((await orderRow(second.id)).status).toBe("AT_SECTOR");
    expect((await orderRow(other.id)).status).toBe("LANDED");

    await expect(markStopDelivered(tripId, await MARS_D7())).resolves.toEqual({ completed: false });
    expect((await orderRow(first.id)).status).toBe("DELIVERED");
    expect((await orderRow(second.id)).status).toBe("DELIVERED");
    expect((await orderRow(other.id)).status).toBe("LANDED");
    expect((await tripRow(tripId)).status).toBe("LANDED");
  });

  it("treats two divisions of one sector as two stops, each with its own sector step", async () => {
    const d7 = await acceptedWater(3, await MARS_D7());
    const d8 = await acceptedWater(2, await MARS_D8());
    const tripId = await landedTrip(d7.id, d8.id);

    const trip = await getMyOpenTrip();
    expect(trip?.stops.map((stop) => [stop.division, stop.units, stop.state])).toEqual([
      ["Division 7", 3, "pending"],
      ["Division 8", 2, "pending"],
    ]);

    await markStopAtSector(tripId, await MARS_D7());
    expect((await orderRow(d8.id)).status).toBe("LANDED");
    expect((await getMyOpenTrip())?.stops.map((stop) => stop.state)).toEqual(["at_sector", "pending"]);
  });

  it("delivers the stops in any order and completes on the last one", async () => {
    const a = await acceptedWater(3, await MARS_D7());
    const b = await acceptedWater(2, await MARS_D8());
    const c = await acceptedWater(4, await MARS_T1());
    const tripId = await landedTrip(a.id, b.id, c.id);

    await markStopAtSector(tripId, await MARS_T1());
    await markStopAtSector(tripId, await MARS_D7());
    await expect(markStopDelivered(tripId, await MARS_D7())).resolves.toEqual({ completed: false });
    await markStopAtSector(tripId, await MARS_D8());
    await expect(markStopDelivered(tripId, await MARS_D8())).resolves.toEqual({ completed: false });
    expect((await tripRow(tripId)).status).toBe("LANDED");
    await expect(markStopDelivered(tripId, await MARS_T1())).resolves.toEqual({ completed: true });

    expect((await tripRow(tripId)).status).toBe("COMPLETED");
    for (const order of [a, b, c]) expect((await orderRow(order.id)).status).toBe("DELIVERED");
  });

  it("completes the trip exactly once when the last two stops are delivered at the same moment", async () => {
    const a = await acceptedWater(3, await MARS_D7());
    const b = await acceptedWater(2, await MARS_D8());
    const tripId = await landedTrip(a.id, b.id);
    await markStopAtSector(tripId, await MARS_D7());
    await markStopAtSector(tripId, await MARS_D8());

    const results = await Promise.all([
      markStopDelivered(tripId, await MARS_D7()),
      markStopDelivered(tripId, await MARS_D8()),
    ]);
    expect(results.filter((result) => result.completed)).toHaveLength(1);
    const trip = await tripRow(tripId);
    expect(trip.status).toBe("COMPLETED");
    expect(await statuses(a.id)).toHaveLength(8);
    expect(await statuses(b.id)).toHaveLength(8);
  });

  it("refuses a stop before the trip has landed", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    const d7 = await MARS_D7();

    await expect(markStopAtSector(tripId, d7)).rejects.toMatchObject({ code: "CONFLICT" });
    await markLoaded(tripId);
    await markLiftedOff(tripId);
    await expect(markStopAtSector(tripId, d7)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(markStopDelivered(tripId, d7)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await orderRow(order.id)).status).toBe("LIFTED_OFF");
  });

  it("refuses the division step before the sector step", async () => {
    const order = await acceptedWater(3);
    const tripId = await landedTrip(order.id);
    await expect(markStopDelivered(tripId, await MARS_D7())).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Mark this stop as delivered to sector first",
    });
    expect(await orderRow(order.id)).toMatchObject({ status: "LANDED", deliveredAt: null });
  });

  it("answers NOT_FOUND for a division that is not part of the trip", async () => {
    const order = await acceptedWater(3, await MARS_D7());
    const tripId = await landedTrip(order.id);
    for (const division of [await MARS_D8(), await VENUS_D1(), randomUUID(), "abc"]) {
      await expect(markStopAtSector(tripId, division)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(markStopDelivered(tripId, division)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });

  it("answers Already done on a second click and writes no second event", async () => {
    const a = await acceptedWater(3, await MARS_D7());
    const b = await acceptedWater(2, await MARS_D8());
    const tripId = await landedTrip(a.id, b.id);
    const d7 = await MARS_D7();
    const done = { code: "CONFLICT", message: "Already done" };

    await markStopAtSector(tripId, d7);
    await expect(markStopAtSector(tripId, d7)).rejects.toMatchObject(done);
    await markStopDelivered(tripId, d7);
    await expect(markStopDelivered(tripId, d7)).rejects.toMatchObject(done);
    await expect(markStopAtSector(tripId, d7)).rejects.toMatchObject(done);
    expect(await timeline(a.id)).toHaveLength(8);
  });

  it("refuses every step after the trip is COMPLETED", async () => {
    const order = await acceptedWater(3);
    const late = await acceptedWater(1);
    const tripId = await landedTrip(order.id);
    const d7 = await MARS_D7();
    await markStopAtSector(tripId, d7);
    await markStopDelivered(tripId, d7);

    const conflict = { code: "CONFLICT" };
    await expect(markStopAtSector(tripId, d7)).rejects.toMatchObject(conflict);
    await expect(markStopDelivered(tripId, d7)).rejects.toMatchObject(conflict);
    await expect(markLoaded(tripId)).rejects.toMatchObject(conflict);
    await expect(markLanded(tripId)).rejects.toMatchObject(conflict);
    await expect(cancelTrip(tripId)).rejects.toMatchObject(conflict);
    await expect(addOrderToTrip(tripId, late.id)).rejects.toMatchObject(conflict);
    await expect(removeOrderFromTrip(tripId, order.id)).rejects.toMatchObject(conflict);

    expect(await tripRow(tripId)).toMatchObject({ status: "COMPLETED", totalUnits: 3 });
    expect(await timeline(order.id)).toHaveLength(8);
  });

  it("answers NOT_FOUND for another captain's trip", async () => {
    const order = await acceptedWater(3);
    const tripId = await landedTrip(order.id);
    switchTo(OTHER_CAPTAIN);
    await expect(markStopAtSector(tripId, await MARS_D7())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(markStopDelivered(tripId, await MARS_D7())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getMyTrip(tripId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await orderRow(order.id)).status).toBe("LANDED");
  });

  it("lets the captain start a new trip after the last delivery", async () => {
    const order = await acceptedWater(3);
    const tripId = await landedTrip(order.id);
    await markStopAtSector(tripId, await MARS_D7());
    await markStopDelivered(tripId, await MARS_D7());

    const finished = await getMyTrip(tripId);
    expect(finished).toMatchObject({ status: "COMPLETED", totalUnits: 3 });
    expect(finished.stops.map((stop) => stop.state)).toEqual(["delivered"]);
    expect(await marsTrip()).not.toBe(tripId);
  });
});

describe("the whole flow", () => {
  it("takes one order from checkout to delivered across three logins", async () => {
    const order = await acceptedWater(3);

    switchTo(CAPTAIN);
    const tripId = (await createTrip(await planetId("Mars"))).id;
    await addOrderToTrip(tripId, order.id);
    await markLoaded(tripId);
    await markLiftedOff(tripId);
    await markLanded(tripId);
    await markStopAtSector(tripId, await MARS_D7());
    await markStopDelivered(tripId, await MARS_D7());

    expect(await timeline(order.id)).toEqual([
      { status: "PLACED", note: null, tripId: null },
      { status: "ACCEPTED", note: null, tripId: null },
      { status: "ASSIGNED", note: null, tripId },
      { status: "LOADED", note: null, tripId },
      { status: "LIFTED_OFF", note: null, tripId },
      { status: "LANDED", note: null, tripId },
      { status: "AT_SECTOR", note: null, tripId },
      { status: "DELIVERED", note: null, tripId },
    ]);
    expect((await tripRow(tripId)).status).toBe("COMPLETED");

    switchTo(CUSTOMER);
    const tracked = await getMyOrder(order.id);
    expect(tracked).toMatchObject({ status: "DELIVERED", paymentStatus: "PAID", totalCents: 4500 });
    expect(tracked.deliveredAt).toBeInstanceOf(Date);
    expect(tracked.timeline.map((event) => event.label)).toEqual([
      "Order placed",
      "Accepted by planet",
      "Assigned to a ship",
      "Loaded on ship",
      "Lifted off from Earth",
      "Landed on Mars",
      "Delivered to Olympus Sector",
      "Delivered to Division 7",
    ]);
    const times = tracked.timeline.map((event) => event.occurredAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("trip history and earnings", () => {
  it("lists own trips newest first with earnings, fuel and profit", async () => {
    await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [(await acceptedWater(18)).id]));
    await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [(await acceptedWater(5)).id]));

    switchTo(CAPTAIN);
    const list = (await listMyTrips()).rows;
    expect(list.map((trip) => trip.number)).toEqual([102, 101]);
    expect(list[1]).toMatchObject({
      planet: "Mars",
      status: "COMPLETED",
      totalUnits: 18,
      earningsCents: 9000,
      fuelCostCents: 4000,
      profitCents: 5000,
    });
    expect(list[0]).toMatchObject({ totalUnits: 5, earningsCents: 2500, profitCents: -1500 });
    expect(list[0].completedAt).toBeInstanceOf(Date);
  });

  it("lists a cancelled trip as zero and an open trip with its expected money", async () => {
    const order = await acceptedWater(6);
    switchTo(CAPTAIN);
    await cancelTrip(await planTrip(CAPTAIN, "Mars", [order.id]));
    await planTrip(CAPTAIN, "Mars", [order.id]);

    const [open, cancelled] = (await listMyTrips()).rows;
    expect(cancelled).toMatchObject({ status: "CANCELLED", totalUnits: 0, earningsCents: 0, profitCents: 0 });
    expect(open).toMatchObject({
      status: "PLANNING",
      totalUnits: 6,
      earningsCents: 3000,
      fuelCostCents: 4000,
      profitCents: -1000,
      completedAt: null,
    });
  });

  it("keeps the frozen fuel cost after the planet's fuel cost changed", async () => {
    const tripId = await planTrip(CAPTAIN, "Mars", [(await acceptedWater(10)).id]);
    await db.update(planets).set({ fuelCostCents: 9900 }).where(eq(planets.name, "Mars"));
    try {
      await flyTrip(CAPTAIN, tripId);
      expect(await getMyTripRow(tripId)).toMatchObject({ fuelCostCents: 4000, profitCents: 1000 });
    } finally {
      await db.update(planets).set({ fuelCostCents: 4000 }).where(eq(planets.name, "Mars"));
    }
  });

  it("never shows a captain another captain's trips", async () => {
    const tripId = await planTrip(CAPTAIN, "Mars", [(await acceptedWater(3)).id]);

    switchTo(OTHER_CAPTAIN);
    expect((await listMyTrips()).rows).toEqual([]);
    await expect(getMyTripRow(tripId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getMyTrip(tripId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getMyTripRow("abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("gives the captain no price, making cost, customer or captain name", async () => {
    const tripId = await planTrip(CAPTAIN, "Mars", [(await acceptedWater(3)).id]);
    const keys = deepKeys([(await listMyTrips()).rows, await getMyTripRow(tripId)]);
    expect(keys.filter((key) => /price|makingcost|customer|captain/i.test(key))).toEqual([]);
  });

  it.each([CUSTOMER, MARS_MANAGER, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    switchTo(email);
    await expect(listMyTrips()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getMyTripRow(randomUUID())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Admiral trips", () => {
  async function twoTrips() {
    const mars = await planTrip(CAPTAIN, "Mars", [(await acceptedWater(18)).id]);
    await flyTrip(CAPTAIN, mars);
    const order = await placeItems({ Water: 4 }, await VENUS_D1());
    await acceptAs(VENUS_MANAGER, order.id);
    const venus = await planTrip(OTHER_CAPTAIN, "Venus", [order.id]);
    return { mars, venus };
  }

  it("lists every trip of every captain with captain, planet, units and money", async () => {
    await twoTrips();
    switchTo(ADMIRAL);
    const list = (await listAllTrips()).rows;

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      captainName: "Captain Orion",
      planet: "Venus",
      status: "PLANNING",
      totalUnits: 4,
      earningsCents: 1200,
      fuelCostCents: 2500,
      profitCents: -1300,
    });
    expect(list[1]).toMatchObject({
      captainName: "Captain Vega",
      planet: "Mars",
      status: "COMPLETED",
      totalUnits: 18,
      earningsCents: 9000,
      profitCents: 5000,
    });
  });

  it("filters by status and by planet, and ignores a bad planet ID", async () => {
    await twoTrips();
    switchTo(ADMIRAL);
    expect(((await listAllTrips({ status: "COMPLETED" })).rows).map((trip) => trip.planet)).toEqual(["Mars"]);
    expect(((await listAllTrips({ planetId: await planetId("Venus") })).rows).map((trip) => trip.planet)).toEqual(["Venus"]);
    expect((await listAllTrips({ status: "CANCELLED" })).rows).toEqual([]);
    expect((await listAllTrips({ planetId: "nope" })).rows).toHaveLength(2);
  });

  it("reads any trip with its orders, stops, captain and profit", async () => {
    const { mars } = await twoTrips();
    switchTo(ADMIRAL);
    const trip = await getAnyTrip(mars);

    expect(trip).toMatchObject({
      captainName: "Captain Vega",
      status: "COMPLETED",
      totalUnits: 18,
      earningsCents: 9000,
      fuelCostCents: 4000,
      profitCents: 5000,
    });
    expect(trip.orders).toHaveLength(1);
    expect(trip.stops.map((stop) => stop.state)).toEqual(["delivered"]);
  });

  it("is NOT_FOUND for an unknown trip", async () => {
    switchTo(ADMIRAL);
    await expect(getAnyTrip(randomUUID())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getAnyTrip("abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([CUSTOMER, MARS_MANAGER, CAPTAIN])("is FORBIDDEN for %s", async (email) => {
    const { mars } = await twoTrips();
    switchTo(email);
    await expect(listAllTrips()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getAnyTrip(mars)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cannot run any captain step", async () => {
    const { venus } = await twoTrips();
    const waiting = await acceptedWater(2);
    switchTo(ADMIRAL);
    const forbidden = { code: "FORBIDDEN" };

    await expect(createTrip(await planetId("Mars"))).rejects.toMatchObject(forbidden);
    await expect(addOrderToTrip(venus, waiting.id)).rejects.toMatchObject(forbidden);
    await expect(removeOrderFromTrip(venus, waiting.id)).rejects.toMatchObject(forbidden);
    await expect(cancelTrip(venus)).rejects.toMatchObject(forbidden);
    await expect(markLoaded(venus)).rejects.toMatchObject(forbidden);
    await expect(markLiftedOff(venus)).rejects.toMatchObject(forbidden);
    await expect(markLanded(venus)).rejects.toMatchObject(forbidden);
    await expect(markStopAtSector(venus, await VENUS_D1())).rejects.toMatchObject(forbidden);
    await expect(markStopDelivered(venus, await VENUS_D1())).rejects.toMatchObject(forbidden);
    switchTo(OTHER_CAPTAIN);
    expect((await getMyOpenTrip())?.status).toBe("PLANNING");
  });
});

describe("expected trip profit", () => {
  // Mars: delivery charge $5 a unit, fuel $40.
  const money = async () => {
    const trip = await getMyOpenTrip();
    return [trip?.earningsCents, trip?.expectedProfitCents, trip?.unitsToBreakEven];
  };

  async function setMars(deliveryChargeCents: number, fuelCostCents: number) {
    switchTo(ADMIRAL);
    await updatePlanetCharges(await planetId("Mars"), { deliveryChargeCents, fuelCostCents });
  }

  afterEach(resetSettings);

  it("starts an empty trip at minus the fuel cost, with the units that cover it", async () => {
    await marsTrip();
    expect(await getMyOpenTrip()).toMatchObject({
      totalUnits: 0,
      fuelCostCents: 4000,
      earningsCents: 0,
      expectedProfitCents: -4000,
      unitsToBreakEven: 8,
    });
  });

  it("follows every add and remove: loss, exactly zero, profit, loss again", async () => {
    const small = await acceptedWater(3);
    const middle = await acceptedWater(5);
    const extra = await acceptedWater(2);
    const tripId = await tripWith(small.id);
    expect(await money()).toEqual([1500, -2500, 5]);

    await addOrderToTrip(tripId, middle.id);
    expect(await money()).toEqual([4000, 0, 0]);

    await addOrderToTrip(tripId, extra.id);
    expect(await money()).toEqual([5000, 1000, 0]);

    await removeOrderFromTrip(tripId, middle.id);
    expect(await money()).toEqual([2500, -1500, 3]);
  });

  it("uses each order's own frozen charge, and today's charge for the units still needed", async () => {
    const before = await acceptedWater(3);
    await setMars(700, 4000);
    const after = await placeItems({ Water: 2 }, await MARS_D7());
    await acceptAs(MARS_MANAGER, after.id);

    await tripWith(before.id, after.id);
    // 3 × $5 + 2 × $7 = $29. Missing $11, at $7 a unit: 2 units.
    expect(await money()).toEqual([2900, -1100, 2]);
  });

  it("keeps the fuel cost of the trip when the planet's fuel cost changes later", async () => {
    const order = await acceptedWater(3);
    await tripWith(order.id);
    await setMars(500, 9900);
    switchTo(CAPTAIN);
    expect(await money()).toEqual([1500, -2500, 5]);
  });

  it("says the fuel cannot be covered when a full ship is not enough", async () => {
    // $101 of fuel at $5 a unit needs 21 units.
    await setMars(500, 10100);
    await marsTrip();
    expect(await money()).toEqual([0, -10100, null]);
  });

  it("says the fuel cannot be covered when the space left is too small", async () => {
    // 18 units sold at $3 earn $54. Then the charge goes to $5 and the fuel to $99.
    await setMars(300, 4000);
    const cheap = await placeItems({ Water: 18 }, await MARS_D7());
    await acceptAs(MARS_MANAGER, cheap.id);
    await setMars(500, 9900);

    // A full ship at $5 would cover $99, but $45 is missing and only 2 units of space are left.
    await tripWith(cheap.id);
    expect(await money()).toEqual([5400, -4500, null]);
  });

  it("does not divide by zero when the delivery charge is 0", async () => {
    await setMars(0, 4000);
    const free = await placeItems({ Water: 4 }, await MARS_D7());
    await acceptAs(MARS_MANAGER, free.id);
    await tripWith(free.id);
    expect(await money()).toEqual([0, -4000, null]);
  });

  it("lets a captain load a loss trip, and keeps showing the loss", async () => {
    const order = await acceptedWater(3);
    const tripId = await tripWith(order.id);
    await markLoaded(tripId);
    expect(await getMyOpenTrip()).toMatchObject({ status: "LOADED", expectedProfitCents: -2500 });
  });

  it("shows the same numbers as the trip history, before and after the trip completes", async () => {
    const first = await acceptedWater(10);
    const second = await acceptedWater(8, await MARS_T1());
    const tripId = await tripWith(first.id, second.id);

    const expected = await getMyOpenTrip();
    expect(expected).toMatchObject({ earningsCents: 9000, expectedProfitCents: 5000 });
    expect(await getMyTripRow(tripId)).toMatchObject({ earningsCents: 9000, profitCents: 5000 });

    await flyTrip(CAPTAIN, tripId);
    expect(await getMyOpenTrip()).toBeNull();
    expect(await getMyTripRow(tripId)).toMatchObject({
      status: "COMPLETED",
      earningsCents: expected?.earningsCents,
      fuelCostCents: expected?.fuelCostCents,
      profitCents: expected?.expectedProfitCents,
    });
    switchTo(ADMIRAL);
    expect(await getAnyTrip(tripId)).toMatchObject({ earningsCents: 9000, profitCents: 5000 });
  });

  it("shows a captain only the money of their own open trip", async () => {
    const order = await acceptedWater(3);
    await tripWith(order.id);
    switchTo(OTHER_CAPTAIN);
    expect(await getMyOpenTrip()).toBeNull();
  });

  it("tells for every planet how many units cover the fuel", async () => {
    switchTo(CAPTAIN);
    const list = await listPlanetsForTrip();
    const units = Object.fromEntries(list.map((planet) => [planet.name, planet.unitsToCoverFuel]));
    expect(units).toEqual({ Mercury: 8, Venus: 9, Mars: 8, Jupiter: 13, Saturn: 14, Uranus: 15, Neptune: 16 });

    await setMars(0, 4000);
    switchTo(CAPTAIN);
    expect((await listPlanetsForTrip()).find((planet) => planet.name === "Mars")?.unitsToCoverFuel).toBeNull();
  });
});

describe("waiting time for captains", () => {
  it("counts an available order from when the planet accepted it", async () => {
    const order = await acceptedWater(3);
    await backdate(order.id, 6 * 1440, 5 * 1440);
    const tripId = await marsTrip();

    const [available] = await listAvailableOrders(tripId);
    expect(available.waitingSince).toEqual((await orderRow(order.id)).acceptedAt);
    expect(Date.now() - available.waitingSince.getTime()).toBeGreaterThan(5 * 86_400_000 - 60_000);
    expect(Date.now() - available.waitingSince.getTime()).toBeLessThan(5 * 86_400_000 + 60_000);
  });

  it("keeps counting from the first accept after an order is removed from a trip", async () => {
    const order = await acceptedWater(3);
    await backdate(order.id, 6 * 1440, 5 * 1440);
    const accepted = (await orderRow(order.id)).acceptedAt;

    const tripId = await tripWith(order.id);
    expect(await listAvailableOrders(tripId)).toEqual([]);
    await removeOrderFromTrip(tripId, order.id);
    expect((await listAvailableOrders(tripId))[0].waitingSince).toEqual(accepted);

    await addOrderToTrip(tripId, order.id);
    await cancelTrip(tripId);
    const again = await marsTrip();
    expect((await listAvailableOrders(again))[0].waitingSince).toEqual(accepted);
  });

  it("lists the longest waiting order first", async () => {
    const newer = await acceptedWater(1);
    const older = await acceptedWater(2);
    await backdate(newer.id, 3000, 100);
    await backdate(older.id, 2000, 1500);
    const tripId = await marsTrip();
    expect((await listAvailableOrders(tripId)).map((order) => order.id)).toEqual([older.id, newer.id]);
  });
});

// A trip that was started and cancelled right away: the quickest way to a long trip history.
async function cancelledTrips(captain: string, count: number, planet = "Mars") {
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    const id = await planTrip(captain, planet, []);
    await cancelTrip(id);
    ids.push(id);
  }
  return ids;
}

describe("trip list pagination", () => {
  it("returns an empty first page for a captain without trips", async () => {
    switchTo(CAPTAIN);
    expect(await listMyTrips({ page: 4 })).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
    switchTo(ADMIRAL);
    expect(await listAllTrips({ page: 4 })).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
  });

  it("keeps exactly 20 trips on one page", async () => {
    await cancelledTrips(CAPTAIN, 20);
    const list = await listMyTrips();
    expect(list).toMatchObject({ total: 20, page: 1, pageCount: 1 });
    expect(list.rows).toHaveLength(20);
    expect(await listMyTrips({ page: 2 })).toEqual(list);
  });

  it("puts the 21st trip on a second page, with no trip repeated or missing", async () => {
    const ids = await cancelledTrips(CAPTAIN, 21);

    const first = await listMyTrips({ page: 1 });
    const second = await listMyTrips({ page: 2 });
    expect(first).toMatchObject({ total: 21, page: 1, pageCount: 2 });
    expect(second).toMatchObject({ total: 21, page: 2, pageCount: 2 });
    expect(first.rows).toHaveLength(20);
    expect([...first.rows, ...second.rows].map((trip) => trip.id)).toEqual([...ids].reverse());
    expect(await listMyTrips({ page: 999 })).toEqual(second);
    expect(await listMyTrips({ page: 0 })).toEqual(first);
  });

  it("uses the trip number as tie-breaker when trips share one time", async () => {
    await cancelledTrips(CAPTAIN, 21);
    // created_at is frozen by a trigger. Only a test may step around it.
    await db.transaction(async (tx) => {
      await tx.execute(sql`alter table trips disable trigger trips_frozen_columns`);
      await tx.execute(sql`update trips set created_at = '2026-01-01T00:00:00Z'`);
      await tx.execute(sql`alter table trips enable trigger trips_frozen_columns`);
    });

    const numbers = [...(await listMyTrips({ page: 1 })).rows, ...(await listMyTrips({ page: 2 })).rows].map(
      (trip) => trip.number,
    );
    expect(numbers).toEqual(Array.from({ length: 21 }, (_, index) => 121 - index));
  });

  it("pages the Admiral's list over every captain", async () => {
    await cancelledTrips(CAPTAIN, 12);
    await cancelledTrips(OTHER_CAPTAIN, 11, "Venus");

    switchTo(ADMIRAL);
    const first = await listAllTrips();
    const second = await listAllTrips({ page: 2 });
    expect(first).toMatchObject({ total: 23, page: 1, pageCount: 2 });
    expect(second.rows).toHaveLength(3);
    expect(new Set([...first.rows, ...second.rows].map((trip) => trip.id)).size).toBe(23);
    expect(await listAllTrips({ planetId: await planetId("Venus"), page: 2 })).toMatchObject({
      total: 11,
      page: 1,
      pageCount: 1,
    });
  });
});

describe("trip search and filters", () => {
  // Captain 1: TRP-101 completed and TRP-102 planning, both Mars. Captain 2: TRP-103 cancelled, Venus.
  async function tripSet() {
    await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [(await acceptedWater(2)).id]));
    await planTrip(CAPTAIN, "Mars", [(await acceptedWater(3)).id]);
    await cancelledTrips(OTHER_CAPTAIN, 1, "Venus");
  }

  const numbers = (list: { rows: { number: number }[] }) => list.rows.map((trip) => trip.number);

  it("filters a captain's own trips by status", async () => {
    await tripSet();
    switchTo(CAPTAIN);
    expect(numbers(await listMyTrips())).toEqual([102, 101]);
    expect(numbers(await listMyTrips({ status: "COMPLETED" }))).toEqual([101]);
    expect(numbers(await listMyTrips({ status: "PLANNING" }))).toEqual([102]);
    // TRP-103 is cancelled, but it belongs to another captain.
    expect(await listMyTrips({ status: "CANCELLED" })).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });

    switchTo(OTHER_CAPTAIN);
    expect(numbers(await listMyTrips({ status: "CANCELLED" }))).toEqual([103]);
    expect(numbers(await listMyTrips({ status: "COMPLETED" }))).toEqual([]);
  });

  it("lets the Admiral find a trip by its full or partial code", async () => {
    await tripSet();
    switchTo(ADMIRAL);
    expect(numbers(await listAllTrips({ q: "TRP-102" }))).toEqual([102]);
    expect(numbers(await listAllTrips({ q: "trp-103" }))).toEqual([103]);
    expect(numbers(await listAllTrips({ q: "101" }))).toEqual([101]);
    expect(numbers(await listAllTrips({ q: " TRP-10 " }))).toEqual([103, 102, 101]);
    expect(await listAllTrips({ q: "TRP-999" })).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
  });

  it("combines trip code, status and planet", async () => {
    await tripSet();
    switchTo(ADMIRAL);
    const mars = await planetId("Mars");
    expect(numbers(await listAllTrips({ q: "TRP-10", status: "COMPLETED" }))).toEqual([101]);
    expect(numbers(await listAllTrips({ q: "TRP-10", planetId: mars }))).toEqual([102, 101]);
    expect(numbers(await listAllTrips({ q: "103", planetId: mars }))).toEqual([]);
    expect(numbers(await listAllTrips({ q: "102", status: "PLANNING", planetId: mars }))).toEqual([102]);
  });

  it("treats wildcards, spaces, quotes and long text as plain text", async () => {
    await tripSet();
    switchTo(ADMIRAL);
    for (const q of ["%", "_", "TRP_101", "TRP%", "' OR '1'='1", "'; drop table trips; --", "x".repeat(5000)]) {
      expect(numbers(await listAllTrips({ q }))).toEqual([]);
    }
    expect(numbers(await listAllTrips({ q: "   " }))).toEqual([103, 102, 101]);
    expect(numbers(await listAllTrips({ q: `${"TRP-101".padEnd(100)}zzz` }))).toEqual([101]);
  });

  it("does not search by captain name", async () => {
    await tripSet();
    switchTo(ADMIRAL);
    expect(numbers(await listAllTrips({ q: "Captain" }))).toEqual([]);
  });

  it("keeps the role checks with every parameter", async () => {
    switchTo(CAPTAIN);
    await expect(listAllTrips({ q: "TRP", page: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    switchTo(ADMIRAL);
    await expect(listMyTrips({ status: "COMPLETED", page: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    actAsNobody();
    await expect(listMyTrips({ page: 2 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(listAllTrips({ q: "TRP" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
