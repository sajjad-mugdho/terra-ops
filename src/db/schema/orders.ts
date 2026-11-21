import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";
import { createdAt, id, MAX_CENTS, updatedAt, utc } from "./columns";
import { orderStatus, paymentStatus } from "./enums";
import { divisions, planets } from "./locations";
import { trips } from "./trips";

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity({ startWith: 1001 }),
    idempotencyKey: uuid("idempotency_key").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    planetId: uuid("planet_id")
      .notNull()
      .references(() => planets.id),
    divisionId: uuid("division_id").notNull(),
    tripId: uuid("trip_id"),
    status: orderStatus("status").notNull().default("PLACED"),
    paymentStatus: paymentStatus("payment_status").notNull().default("PAID"),
    totalUnits: integer("total_units").notNull(),
    rejectReason: text("reject_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    acceptedAt: utc("accepted_at"),
    deliveredAt: utc("delivered_at"),
  },
  (t) => [
    // The order's planet must be its division's planet.
    foreignKey({
      name: "orders_division_planet_fk",
      columns: [t.divisionId, t.planetId],
      foreignColumns: [divisions.id, divisions.planetId],
    }),
    // An order can only ride a trip that goes to its own planet.
    foreignKey({
      name: "orders_trip_planet_fk",
      columns: [t.tripId, t.planetId],
      foreignColumns: [trips.id, trips.planetId],
    }),
    unique("orders_customer_idempotency_unique").on(t.customerId, t.idempotencyKey),
    index("orders_customer_created_idx").on(t.customerId, t.createdAt),
    index("orders_planet_status_idx").on(t.planetId, t.status),
    index("orders_trip_idx").on(t.tripId),
    index("orders_delivered_at_idx").on(t.deliveredAt),
    check("orders_total_units_range", sql`${t.totalUnits} between 1 and 20`),
    check(
      "orders_rejected_is_refunded",
      sql`(${t.status} = 'REJECTED') = (${t.paymentStatus} = 'REFUNDED')`,
    ),
    check(
      "orders_reject_reason_matches_status",
      sql`(${t.status} = 'REJECTED') = (${t.rejectReason} is not null)`,
    ),
    check(
      "orders_trip_matches_status",
      sql`(${t.tripId} is null) = (${t.status} in ('PLACED', 'ACCEPTED', 'REJECTED'))`,
    ),
    check(
      "orders_accepted_at_matches_status",
      sql`(${t.acceptedAt} is null) = (${t.status} in ('PLACED', 'REJECTED'))`,
    ),
    check(
      "orders_delivered_at_matches_status",
      sql`(${t.deliveredAt} is not null) = (${t.status} = 'DELIVERED')`,
    ),
    check(
      "orders_timestamps_in_order",
      sql`${t.acceptedAt} >= ${t.createdAt} and ${t.deliveredAt} >= ${t.acceptedAt}`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    units: integer("units").notNull(),
    // Snapshots taken at checkout. Reports read only these.
    productName: text("product_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    unitMakingCostCents: integer("unit_making_cost_cents").notNull(),
    unitDeliveryChargeCents: integer("unit_delivery_charge_cents").notNull(),
  },
  (t) => [
    unique("order_items_order_product_unique").on(t.orderId, t.productId),
    index("order_items_product_idx").on(t.productId),
    check("order_items_units_range", sql`${t.units} between 1 and 20`),
    check("order_items_unit_price_range", sql`${t.unitPriceCents} between 0 and ${sql.raw(MAX_CENTS)}`),
    check(
      "order_items_unit_making_cost_range",
      sql`${t.unitMakingCostCents} between 0 and ${sql.raw(MAX_CENTS)}`,
    ),
    check(
      "order_items_unit_delivery_charge_range",
      sql`${t.unitDeliveryChargeCents} between 0 and ${sql.raw(MAX_CENTS)}`,
    ),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    // Insert order. The timeline sorts by this, not by time.
    seq: bigint("seq", { mode: "number" }).notNull().unique().generatedAlwaysAsIdentity(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    status: orderStatus("status").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    tripId: uuid("trip_id").references(() => trips.id),
    note: text("note"),
    // clock_timestamp(): now() is frozen at transaction start.
    occurredAt: utc("occurred_at").notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index("order_events_order_seq_idx").on(t.orderId, t.seq),
    // ACCEPTED and ASSIGNED repeat when an order leaves a trip and joins another.
    uniqueIndex("order_events_once_per_status")
      .on(t.orderId, t.status)
      .where(sql`${t.status} not in ('ACCEPTED', 'ASSIGNED')`),
    index("order_events_trip_idx").on(t.tripId),
  ],
);
