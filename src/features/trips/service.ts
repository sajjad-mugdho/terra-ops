import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  notInArray,
  type SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  divisions,
  orderEvents,
  orderItems,
  orders,
  planets,
  sectors,
  trips,
  user,
} from "@/db/schema";
import { requireRole } from "@/features/auth/session";
import type { OrderStatus } from "@/features/orders/status";
import { unitsToCoverFuel } from "@/features/settings/break-even";
import { AppError } from "@/lib/errors";
import { type Paged, pageWindow } from "@/lib/pagination";
import { CHECK_VIOLATION, isPgError, UNIQUE_VIOLATION } from "@/lib/pg-error";
import { likePattern, parseSearch } from "@/lib/search";
import {
  canTripTransition,
  hasReached,
  TRIP_CAPACITY,
  TRIP_CODE_PREFIX,
  type TripStatus,
} from "./status";
import { expectedProfitCents, tripEarningsCents, unitsToBreakEven } from "./profit";
import { groupStops, type Stop } from "./stops";

// What a captain may know about an order: no price, no making cost, no customer.
type OrderForCaptain = {
  id: string;
  number: number;
  divisionId: string;
  sector: string;
  division: string;
  items: { product: string; units: number }[];
  totalUnits: number;
  deliveryChargesCents: number;
};

export type CaptainOrder = OrderForCaptain & { status: OrderStatus };

// waitingSince: when the planet accepted it. A captain may know how long it has waited.
export type AvailableOrder = OrderForCaptain & { waitingSince: Date; fits: boolean };

export type TripDetail = {
  id: string;
  number: number;
  planet: { id: string; name: string; daysFromEarth: number };
  status: TripStatus;
  totalUnits: number;
  fuelCostCents: number;
  createdAt: Date;
  loadedAt: Date | null;
  liftedOffAt: Date | null;
  landedAt: Date | null;
  completedAt: Date | null;
  orders: CaptainOrder[];
  stops: Stop<CaptainOrder>[];
};

// The captain's open trip with its expected money. unitsToBreakEven: 0 covered, null cannot be covered.
export type OpenTrip = TripDetail & {
  earningsCents: number;
  expectedProfitCents: number;
  unitsToBreakEven: number | null;
};

export type TripPlanet = {
  id: string;
  name: string;
  daysFromEarth: number;
  fuelCostCents: number;
  deliveryChargeCents: number;
  waitingOrders: number;
  waitingUnits: number;
  // Units a trip must carry to pay for its fuel. null: never.
  unitsToCoverFuel: number | null;
};

// One line of a trip list. Earnings come from the frozen delivery charges of its orders.
export type TripRow = {
  id: string;
  number: number;
  planet: string;
  status: TripStatus;
  totalUnits: number;
  earningsCents: number;
  fuelCostCents: number;
  profitCents: number;
  createdAt: Date;
  completedAt: Date | null;
};

export type AdmiralTripRow = TripRow & { captainName: string };

export type AdmiralTripDetail = TripDetail & {
  captainName: string;
  earningsCents: number;
  profitCents: number;
};

export type TripListInput = { page?: number; status?: TripStatus };

export type TripFilter = TripListInput & { q?: string; planetId?: string };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ALREADY_LOADED = "The trip is already loaded";
const ALREADY_DONE = "Already done";
const TAKEN = "This order was just taken by another captain";

const isUuid = (value: string) => z.uuid().safeParse(value).success;

const mine = (tripId: string, captainId: string) =>
  and(eq(trips.id, tripId), eq(trips.captainId, captainId));

const earned = db
  .select({
    orderId: orderItems.orderId,
    deliveryChargesCents:
      sql<number>`sum(${orderItems.units} * ${orderItems.unitDeliveryChargeCents})::int`.as(
        "delivery_charges_cents",
      ),
  })
  .from(orderItems)
  .groupBy(orderItems.orderId)
  .as("earned");

// Delivery charges per trip, summed in SQL from the frozen lines.
export const tripEarned = db
  .select({
    tripId: orders.tripId,
    earningsCents:
      sql<number>`sum(${orderItems.units} * ${orderItems.unitDeliveryChargeCents})::int`.as(
        "trip_earnings",
      ),
  })
  .from(orderItems)
  .innerJoin(orders, eq(orders.id, orderItems.orderId))
  .where(isNotNull(orders.tripId))
  .groupBy(orders.tripId)
  .as("trip_earned");

const tripEarnings = sql<number>`coalesce(${tripEarned.earningsCents}, 0)`;

async function listTrips(
  where: SQL | undefined,
  window?: { limit: number; offset: number },
): Promise<AdmiralTripRow[]> {
  const query = db
    .select({
      id: trips.id,
      number: trips.number,
      planet: planets.name,
      status: trips.status,
      totalUnits: trips.totalUnits,
      earningsCents: tripEarnings,
      fuelCostCents: trips.fuelCostCents,
      // A cancelled trip never flew: it burned no fuel and counts as zero.
      profitCents: sql<number>`case when ${trips.status} = 'CANCELLED' then 0 else ${tripEarnings} - ${trips.fuelCostCents} end`,
      createdAt: trips.createdAt,
      completedAt: trips.completedAt,
      captainName: user.name,
    })
    .from(trips)
    .innerJoin(planets, eq(planets.id, trips.planetId))
    .innerJoin(user, eq(user.id, trips.captainId))
    .leftJoin(tripEarned, eq(tripEarned.tripId, trips.id))
    .where(where)
    .orderBy(desc(trips.createdAt), desc(trips.number));
  return window ? query.limit(window.limit).offset(window.offset) : query;
}

// One count query, then one page query. A page past the end shows the last page.
async function pageTrips(where: SQL | undefined, page = 1): Promise<Paged<AdmiralTripRow>> {
  const [{ total }] = await db.select({ total: count() }).from(trips).where(where);
  const { limit, offset, ...window } = pageWindow(page, total);
  return { rows: await listTrips(where, { limit, offset }), total, ...window };
}

// The code as the user reads it, e.g. "TRP-101".
const tripCodeText = sql<string>`${TRIP_CODE_PREFIX}::text || ${trips.number}::text`;

const withoutCaptain = (row: AdmiralTripRow): TripRow => ({
  id: row.id,
  number: row.number,
  planet: row.planet,
  status: row.status,
  totalUnits: row.totalUnits,
  earningsCents: row.earningsCents,
  fuelCostCents: row.fuelCostCents,
  profitCents: row.profitCents,
  createdAt: row.createdAt,
  completedAt: row.completedAt,
});

type LoadedOrder = { order: CaptainOrder; acceptedAt: Date | null };

async function loadOrders(where: SQL | undefined): Promise<LoadedOrder[]> {
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      divisionId: orders.divisionId,
      sector: sectors.name,
      division: divisions.name,
      status: orders.status,
      totalUnits: orders.totalUnits,
      deliveryChargesCents: earned.deliveryChargesCents,
      acceptedAt: orders.acceptedAt,
    })
    .from(orders)
    .innerJoin(divisions, eq(divisions.id, orders.divisionId))
    .innerJoin(sectors, eq(sectors.id, divisions.sectorId))
    .innerJoin(earned, eq(earned.orderId, orders.id))
    .where(where)
    .orderBy(asc(orders.acceptedAt), asc(orders.number));
  if (rows.length === 0) return [];

  const lines = await db
    .select({
      orderId: orderItems.orderId,
      product: orderItems.productName,
      units: orderItems.units,
    })
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(orderItems.productName));

  return rows.map(({ acceptedAt, ...row }) => ({
    acceptedAt,
    order: {
      ...row,
      items: lines
        .filter((line) => line.orderId === row.id)
        .map(({ product, units }) => ({ product, units })),
    },
  }));
}

async function loadCaptainOrders(where: SQL | undefined): Promise<CaptainOrder[]> {
  return (await loadOrders(where)).map((loaded) => loaded.order);
}

async function loadTrip(where: SQL | undefined): Promise<TripDetail | null> {
  const [row] = await db
    .select({
      id: trips.id,
      number: trips.number,
      planetId: planets.id,
      planetName: planets.name,
      daysFromEarth: planets.daysFromEarth,
      status: trips.status,
      totalUnits: trips.totalUnits,
      fuelCostCents: trips.fuelCostCents,
      createdAt: trips.createdAt,
      loadedAt: trips.loadedAt,
      liftedOffAt: trips.liftedOffAt,
      landedAt: trips.landedAt,
      completedAt: trips.completedAt,
    })
    .from(trips)
    .innerJoin(planets, eq(planets.id, trips.planetId))
    .where(where);
  if (!row) return null;

  const tripOrders = await loadCaptainOrders(eq(orders.tripId, row.id));
  const { planetId, planetName, daysFromEarth, ...trip } = row;
  return {
    ...trip,
    planet: { id: planetId, name: planetName, daysFromEarth },
    orders: tripOrders,
    stops: groupStops(tripOrders),
  };
}

export async function listPlanetsForTrip(): Promise<TripPlanet[]> {
  await requireRole("captain");
  const waiting = and(
    eq(orders.planetId, planets.id),
    eq(orders.status, "ACCEPTED"),
    isNull(orders.tripId),
  );
  const rows = await db
    .select({
      id: planets.id,
      name: planets.name,
      daysFromEarth: planets.daysFromEarth,
      fuelCostCents: planets.fuelCostCents,
      deliveryChargeCents: planets.deliveryChargeCents,
      waitingOrders: sql<number>`count(${orders.id})::int`,
      waitingUnits: sql<number>`coalesce(sum(${orders.totalUnits}), 0)::int`,
    })
    .from(planets)
    .leftJoin(orders, waiting)
    .groupBy(planets.id)
    .orderBy(asc(planets.daysFromEarth));
  return rows.map((planet) => ({
    ...planet,
    unitsToCoverFuel: unitsToCoverFuel(planet.fuelCostCents, planet.deliveryChargeCents),
  }));
}

export async function getMyOpenTrip(): Promise<OpenTrip | null> {
  const captain = await requireRole("captain");
  const trip = await loadTrip(
    and(eq(trips.captainId, captain.id), notInArray(trips.status, ["COMPLETED", "CANCELLED"])),
  );
  if (!trip) return null;

  // Orders added from now on pay today's charge. The ones on the trip keep their frozen charge.
  const [planet] = await db
    .select({ deliveryChargeCents: planets.deliveryChargeCents })
    .from(planets)
    .where(eq(planets.id, trip.planet.id));
  const earningsCents = tripEarningsCents(trip.orders);
  return {
    ...trip,
    earningsCents,
    expectedProfitCents: expectedProfitCents(trip.orders, trip.fuelCostCents),
    unitsToBreakEven: unitsToBreakEven({
      earningsCents,
      fuelCostCents: trip.fuelCostCents,
      unitChargeCents: planet.deliveryChargeCents,
      freeUnits: TRIP_CAPACITY - trip.totalUnits,
    }),
  };
}

export async function getMyTrip(id: string): Promise<TripDetail> {
  const captain = await requireRole("captain");
  const trip = isUuid(id) ? await loadTrip(mine(id, captain.id)) : null;
  if (!trip) throw new AppError("NOT_FOUND");
  return trip;
}

export async function listMyTrips(input: TripListInput = {}): Promise<Paged<TripRow>> {
  const captain = await requireRole("captain");
  const paged = await pageTrips(
    and(
      eq(trips.captainId, captain.id),
      input.status ? eq(trips.status, input.status) : undefined,
    ),
    input.page,
  );
  return { ...paged, rows: paged.rows.map(withoutCaptain) };
}

// The money of one own trip, for its detail page.
export async function getMyTripRow(id: string): Promise<TripRow> {
  const captain = await requireRole("captain");
  const [row] = isUuid(id) ? await listTrips(mine(id, captain.id)) : [];
  if (!row) throw new AppError("NOT_FOUND");
  return withoutCaptain(row);
}

export async function listAllTrips(filter: TripFilter = {}): Promise<Paged<AdmiralTripRow>> {
  await requireRole("admiral");
  const text = parseSearch(filter.q);
  return pageTrips(
    and(
      filter.status ? eq(trips.status, filter.status) : undefined,
      filter.planetId && isUuid(filter.planetId) ? eq(trips.planetId, filter.planetId) : undefined,
      text ? ilike(tripCodeText, likePattern(text)) : undefined,
    ),
    filter.page,
  );
}

export async function getAnyTrip(id: string): Promise<AdmiralTripDetail> {
  await requireRole("admiral");
  if (!isUuid(id)) throw new AppError("NOT_FOUND");
  const [trip, [row]] = await Promise.all([
    loadTrip(eq(trips.id, id)),
    listTrips(eq(trips.id, id)),
  ]);
  if (!trip || !row) throw new AppError("NOT_FOUND");
  return {
    ...trip,
    captainName: row.captainName,
    earningsCents: row.earningsCents,
    profitCents: row.profitCents,
  };
}

export async function createTrip(planetId: string): Promise<{ id: string }> {
  const captain = await requireRole("captain");
  const [planet] = isUuid(planetId)
    ? await db
        .select({ id: planets.id, fuelCostCents: planets.fuelCostCents })
        .from(planets)
        .where(eq(planets.id, planetId))
    : [];
  if (!planet) throw new AppError("INVALID", "Unknown planet");

  try {
    // The fuel cost is copied here and never follows later changes.
    const [trip] = await db
      .insert(trips)
      .values({ captainId: captain.id, planetId: planet.id, fuelCostCents: planet.fuelCostCents })
      .returning({ id: trips.id });
    return trip;
  } catch (error) {
    if (isPgError(error, UNIQUE_VIOLATION, "trips_one_open_per_captain")) {
      throw new AppError("CONFLICT", "You already have an open trip");
    }
    throw error;
  }
}

export async function listAvailableOrders(tripId: string): Promise<AvailableOrder[]> {
  const captain = await requireRole("captain");
  const [trip] = isUuid(tripId)
    ? await db
        .select({ planetId: trips.planetId, totalUnits: trips.totalUnits })
        .from(trips)
        .where(mine(tripId, captain.id))
    : [];
  if (!trip) throw new AppError("NOT_FOUND");

  const free = TRIP_CAPACITY - trip.totalUnits;
  const available = await loadOrders(
    and(eq(orders.planetId, trip.planetId), eq(orders.status, "ACCEPTED"), isNull(orders.tripId)),
  );
  // An ACCEPTED order always has accepted_at (a database check), so nothing is dropped here.
  return available.flatMap(({ order, acceptedAt }) => acceptedAt === null ? [] : [{
    id: order.id,
    number: order.number,
    divisionId: order.divisionId,
    sector: order.sector,
    division: order.division,
    items: order.items,
    totalUnits: order.totalUnits,
    deliveryChargesCents: order.deliveryChargesCents,
    waitingSince: acceptedAt,
    fits: order.totalUnits <= free,
  }]);
}

// The database re-checks every trip at commit. A refusal there means a parallel change won.
async function tripTransaction<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.transaction(run);
  } catch (error) {
    if (isPgError(error, CHECK_VIOLATION)) throw new AppError("CONFLICT");
    throw error;
  }
}

// Locks the trip row, so two tabs of one captain run one after the other.
async function lockMyTrip(tx: Tx, tripId: string, captainId: string) {
  const [trip] = isUuid(tripId)
    ? await tx
        .select({ id: trips.id, status: trips.status, totalUnits: trips.totalUnits })
        .from(trips)
        .where(mine(tripId, captainId))
        .for("update")
    : [];
  if (!trip) throw new AppError("NOT_FOUND");
  return trip;
}

type EventInput = { status: OrderStatus; actorId: string; tripId: string; note?: string };

async function addEvents(tx: Tx, orderIds: string[], event: EventInput) {
  if (orderIds.length === 0) return;
  await tx.insert(orderEvents).values(orderIds.map((orderId) => ({ ...event, orderId })));
}

export async function addOrderToTrip(tripId: string, orderId: string): Promise<void> {
  const captain = await requireRole("captain");
  if (!isUuid(tripId) || !isUuid(orderId)) throw new AppError("NOT_FOUND");

  await tripTransaction(async (tx) => {
    const [order] = await tx
      .select({ planetId: orders.planetId, totalUnits: orders.totalUnits, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId));

    // 1. Reserve the space. Two adds to one trip queue up on this row.
    const [trip] = order
      ? await tx
          .update(trips)
          .set({ totalUnits: sql`${trips.totalUnits} + ${order.totalUnits}` })
          .where(
            and(
              mine(tripId, captain.id),
              eq(trips.status, "PLANNING"),
              sql`${trips.totalUnits} + ${order.totalUnits} <= ${TRIP_CAPACITY}`,
            ),
          )
          .returning({ planetId: trips.planetId })
      : [];

    if (!trip) {
      const [found] = await tx
        .select({ status: trips.status })
        .from(trips)
        .where(mine(tripId, captain.id));
      if (!found || !order) throw new AppError("NOT_FOUND");
      if (found.status !== "PLANNING") throw new AppError("CONFLICT", ALREADY_LOADED);
      throw new AppError("CONFLICT", "Not enough space");
    }
    if (order.planetId !== trip.planetId) {
      throw new AppError("INVALID", "This order is for another planet");
    }

    // 2. Claim the order. Two captains queue up on this row and only the first one matches.
    const claimed = await tx
      .update(orders)
      .set({ tripId, status: "ASSIGNED" })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.planetId, trip.planetId),
          eq(orders.status, "ACCEPTED"),
          isNull(orders.tripId),
        ),
      )
      .returning({ id: orders.id });
    if (claimed.length === 0) {
      const waiting = order.status === "PLACED" || order.status === "REJECTED";
      throw new AppError("CONFLICT", waiting ? "This order is not available" : TAKEN);
    }

    await addEvents(tx, [orderId], { status: "ASSIGNED", actorId: captain.id, tripId });
  });
}

export async function removeOrderFromTrip(tripId: string, orderId: string): Promise<void> {
  const captain = await requireRole("captain");
  if (!isUuid(orderId)) throw new AppError("NOT_FOUND");

  await tripTransaction(async (tx) => {
    const trip = await lockMyTrip(tx, tripId, captain.id);
    if (trip.status !== "PLANNING") throw new AppError("CONFLICT", ALREADY_LOADED);

    const [removed] = await tx
      .update(orders)
      .set({ tripId: null, status: "ACCEPTED" })
      .where(and(eq(orders.id, orderId), eq(orders.tripId, tripId), eq(orders.status, "ASSIGNED")))
      .returning({ totalUnits: orders.totalUnits });
    if (!removed) throw new AppError("NOT_FOUND");

    await tx
      .update(trips)
      .set({ totalUnits: sql`${trips.totalUnits} - ${removed.totalUnits}` })
      .where(eq(trips.id, tripId));
    await addEvents(tx, [orderId], {
      status: "ACCEPTED",
      actorId: captain.id,
      tripId,
      note: "Removed from trip",
    });
  });
}

export async function cancelTrip(tripId: string): Promise<void> {
  const captain = await requireRole("captain");

  await tripTransaction(async (tx) => {
    const trip = await lockMyTrip(tx, tripId, captain.id);
    if (trip.status === "CANCELLED") throw new AppError("CONFLICT", ALREADY_DONE);
    if (!canTripTransition(trip.status, "CANCELLED")) {
      throw new AppError("CONFLICT", ALREADY_LOADED);
    }

    const freed = await tx
      .update(orders)
      .set({ tripId: null, status: "ACCEPTED" })
      .where(eq(orders.tripId, tripId))
      .returning({ id: orders.id });
    await tx
      .update(trips)
      .set({ status: "CANCELLED", totalUnits: 0, cancelledAt: sql`now()` })
      .where(eq(trips.id, tripId));
    await addEvents(
      tx,
      freed.map((order) => order.id),
      { status: "ACCEPTED", actorId: captain.id, tripId, note: "Trip cancelled" },
    );
  });
}

const STEP_TIME = {
  LOADED: "loadedAt",
  LIFTED_OFF: "liftedOffAt",
  LANDED: "landedAt",
} as const;

// A whole-trip step: the trip and every order on it move together.
async function advanceTrip(tripId: string, step: keyof typeof STEP_TIME): Promise<void> {
  const captain = await requireRole("captain");

  await tripTransaction(async (tx) => {
    const trip = await lockMyTrip(tx, tripId, captain.id);
    if (hasReached(trip.status, step)) throw new AppError("CONFLICT", ALREADY_DONE);
    if (!canTripTransition(trip.status, step)) {
      throw new AppError("CONFLICT", "This step is not available yet");
    }
    if (step === "LOADED" && trip.totalUnits === 0) {
      throw new AppError("INVALID", "Add at least one order");
    }

    await tx
      .update(trips)
      .set({ status: step, [STEP_TIME[step]]: sql`now()` })
      .where(eq(trips.id, tripId));
    const moved = await tx
      .update(orders)
      .set({ status: step })
      .where(eq(orders.tripId, tripId))
      .returning({ id: orders.id });
    await addEvents(
      tx,
      moved.map((order) => order.id),
      { status: step, actorId: captain.id, tripId },
    );
  });
}

export async function markLoaded(tripId: string): Promise<void> {
  await advanceTrip(tripId, "LOADED");
}

export async function markLiftedOff(tripId: string): Promise<void> {
  await advanceTrip(tripId, "LIFTED_OFF");
}

export async function markLanded(tripId: string): Promise<void> {
  await advanceTrip(tripId, "LANDED");
}

// A stop step: every order of one division in the trip moves together.
async function advanceStop(
  tripId: string,
  divisionId: string,
  step: "AT_SECTOR" | "DELIVERED",
): Promise<{ completed: boolean }> {
  const captain = await requireRole("captain");
  if (!isUuid(divisionId)) throw new AppError("NOT_FOUND");
  const from = step === "AT_SECTOR" ? "LANDED" : "AT_SECTOR";
  const stop = and(eq(orders.tripId, tripId), eq(orders.divisionId, divisionId));

  return tripTransaction(async (tx) => {
    const trip = await lockMyTrip(tx, tripId, captain.id);
    const stopOrders = await tx.select({ status: orders.status }).from(orders).where(stop);
    if (stopOrders.length === 0) throw new AppError("NOT_FOUND");
    if (trip.status === "COMPLETED") throw new AppError("CONFLICT", ALREADY_DONE);
    if (trip.status !== "LANDED") throw new AppError("CONFLICT", "The trip has not landed yet");

    const moved = await tx
      .update(orders)
      .set({ status: step, ...(step === "DELIVERED" && { deliveredAt: sql`now()` }) })
      .where(and(stop, eq(orders.status, from)))
      .returning({ id: orders.id });
    if (moved.length === 0) {
      const done = stopOrders.every((order) => order.status !== "LANDED");
      throw new AppError(
        "CONFLICT",
        step === "DELIVERED" && !done ? "Mark this stop as delivered to sector first" : ALREADY_DONE,
      );
    }
    await addEvents(
      tx,
      moved.map((order) => order.id),
      { status: step, actorId: captain.id, tripId },
    );
    if (step !== "DELIVERED") return { completed: false };

    // The last delivery closes the trip in the same transaction.
    const left = await tx.$count(orders, and(eq(orders.tripId, tripId), ne(orders.status, "DELIVERED")));
    if (left > 0) return { completed: false };
    await tx
      .update(trips)
      .set({ status: "COMPLETED", completedAt: sql`now()` })
      .where(eq(trips.id, tripId));
    return { completed: true };
  });
}

export async function markStopAtSector(tripId: string, divisionId: string): Promise<void> {
  await advanceStop(tripId, divisionId, "AT_SECTOR");
}

export async function markStopDelivered(
  tripId: string,
  divisionId: string,
): Promise<{ completed: boolean }> {
  return advanceStop(tripId, divisionId, "DELIVERED");
}
