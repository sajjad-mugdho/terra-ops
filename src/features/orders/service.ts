import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  divisions,
  orderEvents,
  orderItems,
  orders,
  planets,
  products,
  sectors,
  trips,
  user,
} from "@/db/schema";
import { requireManagerPlanet, requireRole } from "@/features/auth/session";
import { getDivisionWithPlanet } from "@/features/locations/service";
import { AppError } from "@/lib/errors";
import { type Paged, pageWindow } from "@/lib/pagination";
import { likePattern, parseSearch } from "@/lib/search";
import { lineTotalCents, makingCostCents, mergeLines, orderTotals } from "./pricing";
import type { PlaceOrderInput } from "./schemas";
import { eventLabel, ORDER_CODE_PREFIX, type OrderStatus, type PaymentStatus } from "./status";
import { type OrderSort, OVERDUE_DAYS, waitingSince } from "./waiting";

export type Destination = { planet: string; sector: string; division: string };

export type OrderListRow = {
  id: string;
  number: number;
  destination: Destination;
  totalUnits: number;
  totalCents: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
};

// waitingSince is for the people who can act on the order. Customers never get it.
export type PlanetOrderRow = OrderListRow & { customerName: string; waitingSince: Date | null };

export type OrderLine = {
  productName: string;
  units: number;
  unitPriceCents: number;
  unitDeliveryChargeCents: number;
  lineTotalCents: number;
};

export type TimelineEvent = {
  status: OrderStatus;
  label: string;
  note: string | null;
  occurredAt: Date;
};

export type OrderDetail = {
  id: string;
  number: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  rejectReason: string | null;
  destination: Destination;
  daysFromEarth: number;
  createdAt: Date;
  deliveredAt: Date | null;
  items: OrderLine[];
  totalUnits: number;
  productAmountCents: number;
  deliveryChargesCents: number;
  totalCents: number;
  timeline: TimelineEvent[];
  trip: { number: number; liftedOffAt: Date | null; landedAt: Date | null } | null;
};

export type PlanetOrderDetail = OrderDetail & { customerName: string };

export type OrderListInput = { page?: number; q?: string; status?: OrderStatus };

export type OrderFilter = OrderListInput & {
  planetId?: string;
  overdue?: boolean;
  sort?: OrderSort;
};

// Admiral only. The one order DTO that carries making cost and profit.
export type AdmiralOrderDetail = Omit<PlanetOrderDetail, "items" | "timeline"> & {
  items: (OrderLine & { unitMakingCostCents: number })[];
  timeline: (TimelineEvent & { actorName: string })[];
  makingCostCents: number;
  profitCents: number;
};

// A customer's own orders in numbers. totalPaidCents leaves out refunded orders.
export type OrderSummary = { active: number; delivered: number; totalPaidCents: number };

export type QueueOrder = {
  id: string;
  number: number;
  customerName: string;
  sector: string;
  division: string;
  items: { productName: string; units: number }[];
  totalUnits: number;
  totalCents: number;
  createdAt: Date;
  waitingSince: Date;
};

const HANDLED = "This order was already handled";

const isUuid = (value: string) => z.uuid().safeParse(value).success;

// What the customer paid per order, summed in SQL from the frozen lines.
const paid = db
  .select({
    orderId: orderItems.orderId,
    totalCents:
      sql<number>`sum(${orderItems.units} * (${orderItems.unitPriceCents} + ${orderItems.unitDeliveryChargeCents}))::int`.as(
        "total_cents",
      ),
  })
  .from(orderItems)
  .groupBy(orderItems.orderId)
  .as("paid");

// Same rule as waitingSince() in ./waiting, for filters and sorting in SQL.
const waitingStart = sql`case ${orders.status} when 'PLACED' then ${orders.createdAt} when 'ACCEPTED' then ${orders.acceptedAt} end`;

// Waiting for more than OVERDUE_DAYS. The dashboard count and the filtered list share it.
export const overdueOrders = sql`${waitingStart} < now() - make_interval(days => ${OVERDUE_DAYS})`;

export async function placeOrder(input: PlaceOrderInput): Promise<{ id: string; number: number }> {
  const customer = await requireRole("customer");
  const lines = mergeLines(input.items);
  // The planet and its delivery charge come from the division, never from the client.
  const division = await getDivisionWithPlanet(input.divisionId);

  return db.transaction(async (tx) => {
    const mine = and(
      eq(orders.customerId, customer.id),
      eq(orders.idempotencyKey, input.idempotencyKey),
    );
    const placed = { id: orders.id, number: orders.number };
    const [existing] = await tx.select(placed).from(orders).where(mine);
    if (existing) return existing;

    const priced = await tx
      .select()
      .from(products)
      .where(
        inArray(
          products.id,
          lines.map((line) => line.productId),
        ),
      );
    const items = lines.map((line) => {
      const product = priced.find((each) => each.id === line.productId);
      if (!product) throw new AppError("INVALID", "Unknown product");
      return {
        productId: product.id,
        units: line.units,
        productName: product.name,
        unitPriceCents: product.priceCents,
        unitMakingCostCents: product.makingCostCents,
        unitDeliveryChargeCents: division.deliveryChargeCents,
      };
    });

    const totals = orderTotals(items);
    if (totals.totalCents !== input.expectedTotalCents) {
      throw new AppError("CONFLICT", "Prices changed. Please review the new total.");
    }

    const [order] = await tx
      .insert(orders)
      .values({
        idempotencyKey: input.idempotencyKey,
        customerId: customer.id,
        planetId: division.planetId,
        divisionId: division.divisionId,
        totalUnits: totals.totalUnits,
      })
      .onConflictDoNothing({ target: [orders.customerId, orders.idempotencyKey] })
      .returning(placed);
    // A double click that raced past the first lookup: the other request made the order.
    if (!order) return (await tx.select(placed).from(orders).where(mine))[0];

    await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: order.id })));
    await tx
      .insert(orderEvents)
      .values({ orderId: order.id, status: "PLACED", actorId: customer.id });
    return order;
  });
}

type Listed = { order: OrderListRow; customerName: string; waitingSince: Date | null };

// The code as the user reads it, e.g. "ORD-12", so a search matches what is on screen.
const orderCodeText = sql<string>`${ORDER_CODE_PREFIX}::text || ${orders.number}::text`;

// Customers search their own orders by code only. Staff may also search the customer name.
function matchesSearch(q: string | undefined, byCustomerName: boolean): SQL | undefined {
  const text = parseSearch(q);
  if (!text) return undefined;
  const pattern = likePattern(text);
  const code = ilike(orderCodeText, pattern);
  return byCustomerName ? or(code, ilike(user.name, pattern)) : code;
}

async function listOrders(
  where: SQL | undefined,
  order: SQL[],
  window?: { limit: number; offset: number },
): Promise<Listed[]> {
  const query = db
    .select({
      id: orders.id,
      number: orders.number,
      planet: planets.name,
      sector: sectors.name,
      division: divisions.name,
      totalUnits: orders.totalUnits,
      totalCents: paid.totalCents,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      acceptedAt: orders.acceptedAt,
      customerName: user.name,
    })
    .from(orders)
    .innerJoin(planets, eq(planets.id, orders.planetId))
    .innerJoin(divisions, eq(divisions.id, orders.divisionId))
    .innerJoin(sectors, eq(sectors.id, divisions.sectorId))
    .innerJoin(user, eq(user.id, orders.customerId))
    .innerJoin(paid, eq(paid.orderId, orders.id))
    .where(where)
    .orderBy(...order);
  const rows = await (window ? query.limit(window.limit).offset(window.offset) : query);

  return rows.map(({ planet, sector, division, customerName, acceptedAt, ...row }) => ({
    order: { ...row, destination: { planet, sector, division } },
    customerName,
    waitingSince: waitingSince({ status: row.status, createdAt: row.createdAt, acceptedAt }),
  }));
}

// One count query, then one page query. A page past the end shows the last page.
async function pageOrders(where: SQL | undefined, order: SQL[], page = 1): Promise<Paged<Listed>> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .innerJoin(user, eq(user.id, orders.customerId))
    .where(where);
  const { limit, offset, ...window } = pageWindow(page, total);
  return { rows: await listOrders(where, order, { limit, offset }), total, ...window };
}

const newestFirst = [desc(orders.createdAt), desc(orders.number)];

const withCustomer = ({ order, customerName, waitingSince }: Listed): PlanetOrderRow => ({
  ...order,
  customerName,
  waitingSince,
});

async function loadOrder(
  scope: SQL | undefined,
): Promise<{ order: OrderDetail; customerName: string }> {
  const [row] = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      rejectReason: orders.rejectReason,
      createdAt: orders.createdAt,
      deliveredAt: orders.deliveredAt,
      planet: planets.name,
      daysFromEarth: planets.daysFromEarth,
      sector: sectors.name,
      division: divisions.name,
      customerName: user.name,
      tripNumber: trips.number,
      liftedOffAt: trips.liftedOffAt,
      landedAt: trips.landedAt,
    })
    .from(orders)
    .innerJoin(planets, eq(planets.id, orders.planetId))
    .innerJoin(divisions, eq(divisions.id, orders.divisionId))
    .innerJoin(sectors, eq(sectors.id, divisions.sectorId))
    .innerJoin(user, eq(user.id, orders.customerId))
    .leftJoin(trips, eq(trips.id, orders.tripId))
    .where(scope);
  if (!row) throw new AppError("NOT_FOUND");

  // Amounts always come from the frozen lines, never from today's prices.
  const lines = await db
    .select({
      productName: orderItems.productName,
      units: orderItems.units,
      unitPriceCents: orderItems.unitPriceCents,
      unitDeliveryChargeCents: orderItems.unitDeliveryChargeCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, row.id))
    .orderBy(asc(orderItems.productName));

  const events = await db
    .select({
      status: orderEvents.status,
      note: orderEvents.note,
      tripId: orderEvents.tripId,
      occurredAt: orderEvents.occurredAt,
    })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, row.id))
    .orderBy(asc(orderEvents.seq));

  const { planet, sector, division, tripNumber, liftedOffAt, landedAt, customerName, ...order } = row;
  const destination = { planet, sector, division };
  return {
    customerName,
    order: {
      ...order,
      destination,
      items: lines.map((line) => ({ ...line, lineTotalCents: lineTotalCents(line) })),
      ...orderTotals(lines),
      timeline: events.map(({ tripId, ...event }) => ({
        ...event,
        label: eventLabel(event.status, destination, tripId !== null),
      })),
      trip: tripNumber === null ? null : { number: tripNumber, liftedOffAt, landedAt },
    },
  };
}

export async function listMyOrders(input: OrderListInput = {}): Promise<Paged<OrderListRow>> {
  const customer = await requireRole("customer");
  const paged = await pageOrders(
    and(
      eq(orders.customerId, customer.id),
      input.status ? eq(orders.status, input.status) : undefined,
      matchesSearch(input.q, false),
    ),
    newestFirst,
    input.page,
  );
  return { ...paged, rows: paged.rows.map((row) => row.order) };
}

export async function getMyOrderSummary(): Promise<OrderSummary> {
  const customer = await requireRole("customer");
  const [row] = await db
    .select({
      active: sql<number>`(count(*) filter (where ${orders.status} not in ('DELIVERED', 'REJECTED')))::int`,
      delivered: sql<number>`(count(*) filter (where ${orders.status} = 'DELIVERED'))::int`,
      totalPaidCents:
        sql<number>`coalesce(sum(${paid.totalCents}) filter (where ${orders.paymentStatus} = 'PAID'), 0)`.mapWith(
          Number,
        ),
    })
    .from(orders)
    .innerJoin(paid, eq(paid.orderId, orders.id))
    .where(eq(orders.customerId, customer.id));
  return row;
}

export async function getMyOrder(id: string): Promise<OrderDetail> {
  const customer = await requireRole("customer");
  if (!isUuid(id)) throw new AppError("NOT_FOUND");
  return (await loadOrder(and(eq(orders.id, id), eq(orders.customerId, customer.id)))).order;
}

export async function listQueue(): Promise<QueueOrder[]> {
  const manager = await requireManagerPlanet();
  const rows = await listOrders(
    and(eq(orders.planetId, manager.planetId), eq(orders.status, "PLACED")),
    [asc(orders.createdAt), asc(orders.number)],
  );
  if (rows.length === 0) return [];

  const lines = await db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      units: orderItems.units,
    })
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.order.id),
      ),
    )
    .orderBy(asc(orderItems.productName));

  return rows.map(({ order, customerName }) => ({
    id: order.id,
    number: order.number,
    customerName,
    sector: order.destination.sector,
    division: order.destination.division,
    items: lines
      .filter((line) => line.orderId === order.id)
      .map(({ productName, units }) => ({ productName, units })),
    totalUnits: order.totalUnits,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    waitingSince: order.createdAt,
  }));
}

export async function listPlanetOrders(input: OrderListInput = {}): Promise<Paged<PlanetOrderRow>> {
  const manager = await requireManagerPlanet();
  const paged = await pageOrders(
    and(
      eq(orders.planetId, manager.planetId),
      input.status ? eq(orders.status, input.status) : undefined,
      matchesSearch(input.q, true),
    ),
    newestFirst,
    input.page,
  );
  return { ...paged, rows: paged.rows.map(withCustomer) };
}

export async function getPlanetOrder(id: string): Promise<PlanetOrderDetail> {
  const manager = await requireManagerPlanet();
  if (!isUuid(id)) throw new AppError("NOT_FOUND");
  const { order, customerName } = await loadOrder(
    and(eq(orders.id, id), eq(orders.planetId, manager.planetId)),
  );
  return { ...order, customerName };
}

type Decision =
  | { status: "ACCEPTED" }
  | { status: "REJECTED"; reason: string };

async function decide(id: string, decision: Decision): Promise<void> {
  const manager = await requireManagerPlanet();
  if (!isUuid(id)) throw new AppError("NOT_FOUND");
  const mine = and(eq(orders.id, id), eq(orders.planetId, manager.planetId));

  await db.transaction(async (tx) => {
    // One statement decides the race: only a PLACED order of this planet changes.
    const changed = await tx
      .update(orders)
      .set(
        decision.status === "ACCEPTED"
          ? { status: "ACCEPTED", acceptedAt: sql`now()` }
          : { status: "REJECTED", paymentStatus: "REFUNDED", rejectReason: decision.reason },
      )
      .where(and(mine, eq(orders.status, "PLACED")))
      .returning({ id: orders.id });

    if (changed.length === 0) {
      const [found] = await tx.select({ id: orders.id }).from(orders).where(mine);
      throw found ? new AppError("CONFLICT", HANDLED) : new AppError("NOT_FOUND");
    }

    await tx.insert(orderEvents).values({
      orderId: id,
      status: decision.status,
      actorId: manager.id,
      note: decision.status === "REJECTED" ? decision.reason : null,
    });
  });
}

export async function acceptOrder(id: string): Promise<void> {
  await decide(id, { status: "ACCEPTED" });
}

export async function rejectOrder(id: string, reason: string): Promise<void> {
  const text = reason.trim();
  if (text.length < 3 || text.length > 300) {
    throw new AppError("INVALID", "Give a reason of 3 to 300 characters");
  }
  await decide(id, { status: "REJECTED", reason: text });
}

export async function listAllOrders(filter: OrderFilter = {}): Promise<Paged<PlanetOrderRow>> {
  await requireRole("admiral");
  const paged = await pageOrders(
    and(
      filter.status ? eq(orders.status, filter.status) : undefined,
      filter.planetId && isUuid(filter.planetId) ? eq(orders.planetId, filter.planetId) : undefined,
      filter.overdue ? overdueOrders : undefined,
      matchesSearch(filter.q, true),
    ),
    [
      // Longest waiting first. Orders that do not wait come after, newest first.
      ...(filter.sort === "waiting" ? [sql`${waitingStart} asc nulls last`] : []),
      ...newestFirst,
    ],
    filter.page,
  );
  return { ...paged, rows: paged.rows.map(withCustomer) };
}

export async function getAnyOrder(id: string): Promise<AdmiralOrderDetail> {
  await requireRole("admiral");
  if (!isUuid(id)) throw new AppError("NOT_FOUND");
  const { order, customerName } = await loadOrder(eq(orders.id, id));

  const lines = await db
    .select({
      productName: orderItems.productName,
      units: orderItems.units,
      unitPriceCents: orderItems.unitPriceCents,
      unitDeliveryChargeCents: orderItems.unitDeliveryChargeCents,
      unitMakingCostCents: orderItems.unitMakingCostCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.productName));

  const events = await db
    .select({
      status: orderEvents.status,
      note: orderEvents.note,
      tripId: orderEvents.tripId,
      occurredAt: orderEvents.occurredAt,
      actorName: user.name,
    })
    .from(orderEvents)
    .innerJoin(user, eq(user.id, orderEvents.actorId))
    .where(eq(orderEvents.orderId, id))
    .orderBy(asc(orderEvents.seq));

  const cost = makingCostCents(lines);
  return {
    ...order,
    customerName,
    items: lines.map((line) => ({ ...line, lineTotalCents: lineTotalCents(line) })),
    timeline: events.map(({ tripId, ...event }) => ({
      ...event,
      label: eventLabel(event.status, order.destination, tripId !== null),
    })),
    makingCostCents: cost,
    // Company profit: the delivery charges belong to the captain (D5).
    profitCents: order.productAmountCents - cost,
  };
}
