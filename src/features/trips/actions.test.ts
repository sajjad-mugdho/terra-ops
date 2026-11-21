import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { seedReference } from "@/seed/reference";
import {
  acceptedWater,
  ALL_ACTORS,
  CAPTAIN,
  clearOrders,
  CUSTOMER,
  MARS_D7,
  MARS_D8,
  OTHER_CAPTAIN,
  planetId,
} from "@/test/orders";
import { redirectTarget } from "@/test/redirect";
import { signInAll, switchTo } from "@/test/session";
import {
  addOrderToTripAction,
  cancelTripAction,
  createTripAction,
  markLandedAction,
  markLiftedOffAction,
  markLoadedAction,
  markStopAtSectorAction,
  markStopDeliveredAction,
  removeOrderFromTripAction,
} from "./actions";

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));
vi.mock("next/cache", () => cache);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const ok = (message: string) => ({ ok: true, data: { message } });

async function startTrip() {
  switchTo(CAPTAIN);
  await createTripAction(null, form({ planetId: await planetId("Mars") }));
  return (await db.select().from(trips))[0].id;
}

beforeAll(async () => {
  await seedReference();
  await signInAll(ALL_ACTORS);
});

beforeEach(async () => {
  await clearOrders();
  vi.clearAllMocks();
});

describe("trip actions", () => {
  it("runs a whole trip through its nine actions", async () => {
    const first = await acceptedWater(3, await MARS_D7());
    const second = await acceptedWater(2, await MARS_D8());
    const dropped = await acceptedWater(1);
    const tripId = await startTrip();
    const trip = { tripId };

    for (const order of [first, second, dropped]) {
      const added = await addOrderToTripAction(null, form({ ...trip, orderId: order.id }));
      expect(added).toEqual(ok("Order added"));
    }
    const removed = await removeOrderFromTripAction(null, form({ ...trip, orderId: dropped.id }));
    expect(removed).toEqual(ok("Order removed"));

    expect(await markLoadedAction(null, form(trip))).toEqual(ok("Trip loaded"));
    expect(await markLiftedOffAction(null, form(trip))).toEqual(ok("Lifted off"));
    expect(await markLandedAction(null, form(trip))).toEqual(ok("Landed"));

    const d7 = form({ ...trip, divisionId: await MARS_D7() });
    const d8 = form({ ...trip, divisionId: await MARS_D8() });
    expect(await markStopAtSectorAction(null, d7)).toEqual(ok("Delivered to sector"));
    expect(await markStopDeliveredAction(null, d7)).toEqual(ok("Delivered to division"));
    expect(await markStopAtSectorAction(null, d8)).toEqual(ok("Delivered to sector"));

    // The last delivery completes the trip and shows its summary.
    const target = await redirectTarget(() => markStopDeliveredAction(null, d8));
    expect(target).toBe(`/captain/trip?completed=${tripId}`);
    expect((await db.select().from(trips))[0].status).toBe("COMPLETED");
  });

  it("refreshes the captain page and the tracking pages after every change", async () => {
    await startTrip();
    for (const path of ["/captain/trip", "/customer/orders"]) {
      expect(cache.revalidatePath).toHaveBeenCalledWith(path);
    }
    expect(cache.revalidatePath).toHaveBeenCalledWith("/customer/orders/[id]", "page");
  });

  it("cancels a trip", async () => {
    const tripId = await startTrip();
    expect(await cancelTripAction(null, form({ tripId }))).toEqual(ok("Trip cancelled"));
  });

  it("shows the service message when a step is refused, and refreshes the page", async () => {
    const tripId = await startTrip();
    vi.clearAllMocks();

    expect(await markLoadedAction(null, form({ tripId }))).toEqual({
      ok: false,
      error: "Add at least one order",
    });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/captain/trip");

    expect(await createTripAction(null, form({ planetId: await planetId("Venus") }))).toEqual({
      ok: false,
      error: "You already have an open trip",
    });
  });

  it("tells the second captain that the order was just taken", async () => {
    const order = await acceptedWater(3);
    const tripId = await startTrip();
    await addOrderToTripAction(null, form({ tripId, orderId: order.id }));

    switchTo(OTHER_CAPTAIN);
    await createTripAction(null, form({ planetId: await planetId("Mars") }));
    const other = (await db.select().from(trips)).find((trip) => trip.id !== tripId);
    const result = await addOrderToTripAction(null, form({ tripId: other!.id, orderId: order.id }));
    expect(result).toEqual({ ok: false, error: "This order was just taken by another captain" });
  });

  it.each([
    ["createTripAction", createTripAction, { planetId: "mars" }],
    ["addOrderToTripAction", addOrderToTripAction, { tripId: "x", orderId: randomUUID() }],
    ["markLoadedAction", markLoadedAction, {}],
    ["markStopAtSectorAction", markStopAtSectorAction, { tripId: randomUUID() }],
  ])("%s returns an input error for a malformed ID", async (_, action, fields) => {
    switchTo(CAPTAIN);
    expect(await action(null, form(fields))).toMatchObject({
      ok: false,
      error: "Please check your input",
    });
  });

  it("refuses a customer and another captain", async () => {
    const tripId = await startTrip();
    switchTo(CUSTOMER);
    expect(await cancelTripAction(null, form({ tripId }))).toEqual({ ok: false, error: "Not allowed" });
    switchTo(OTHER_CAPTAIN);
    expect(await cancelTripAction(null, form({ tripId }))).toEqual({ ok: false, error: "Not found" });
  });
});
