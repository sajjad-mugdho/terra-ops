import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, id, MAX_CENTS, updatedAt, utc } from "./columns";
import { tripStatus } from "./enums";
import { planets } from "./locations";

export const trips = pgTable(
  "trips",
  {
    id: id(),
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity({ startWith: 101 }),
    captainId: text("captain_id")
      .notNull()
      .references(() => user.id),
    planetId: uuid("planet_id")
      .notNull()
      .references(() => planets.id),
    status: tripStatus("status").notNull().default("PLANNING"),
    totalUnits: integer("total_units").notNull().default(0),
    // Snapshot of the planet's fuel cost when the trip was created.
    fuelCostCents: integer("fuel_cost_cents").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    loadedAt: utc("loaded_at"),
    liftedOffAt: utc("lifted_off_at"),
    landedAt: utc("landed_at"),
    completedAt: utc("completed_at"),
    cancelledAt: utc("cancelled_at"),
  },
  (t) => [
    // Target of the composite FK from orders.
    unique("trips_id_planet_unique").on(t.id, t.planetId),
    uniqueIndex("trips_one_open_per_captain")
      .on(t.captainId)
      .where(sql`${t.status} not in ('COMPLETED', 'CANCELLED')`),
    index("trips_captain_status_idx").on(t.captainId, t.status),
    index("trips_planet_status_idx").on(t.planetId, t.status),
    index("trips_completed_at_idx").on(t.completedAt),
    check("trips_total_units_range", sql`${t.totalUnits} between 0 and 20`),
    check("trips_fuel_cost_range", sql`${t.fuelCostCents} between 0 and ${sql.raw(MAX_CENTS)}`),
    check(
      "trips_timestamps_in_order",
      sql`${t.loadedAt} >= ${t.createdAt} and ${t.liftedOffAt} >= ${t.loadedAt} and ${t.landedAt} >= ${t.liftedOffAt} and ${t.completedAt} >= ${t.landedAt} and ${t.cancelledAt} >= ${t.createdAt}`,
    ),
    check(
      "trips_not_empty_after_planning",
      sql`${t.status} in ('PLANNING', 'CANCELLED') or ${t.totalUnits} >= 1`,
    ),
    check("trips_cancelled_is_empty", sql`${t.status} <> 'CANCELLED' or ${t.totalUnits} = 0`),
    check(
      "trips_loaded_at_matches_status",
      sql`(${t.loadedAt} is not null) = (${t.status} in ('LOADED', 'LIFTED_OFF', 'LANDED', 'COMPLETED'))`,
    ),
    check(
      "trips_lifted_off_at_matches_status",
      sql`(${t.liftedOffAt} is not null) = (${t.status} in ('LIFTED_OFF', 'LANDED', 'COMPLETED'))`,
    ),
    check(
      "trips_landed_at_matches_status",
      sql`(${t.landedAt} is not null) = (${t.status} in ('LANDED', 'COMPLETED'))`,
    ),
    check(
      "trips_completed_at_matches_status",
      sql`(${t.completedAt} is not null) = (${t.status} = 'COMPLETED')`,
    ),
    check(
      "trips_cancelled_at_matches_status",
      sql`(${t.cancelledAt} is not null) = (${t.status} = 'CANCELLED')`,
    ),
  ],
);
