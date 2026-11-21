import { sql } from "drizzle-orm";
import { check, foreignKey, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, id, MAX_CENTS, updatedAt } from "./columns";

export const planets = pgTable(
  "planets",
  {
    id: id(),
    name: text("name").notNull().unique(),
    daysFromEarth: integer("days_from_earth").notNull(),
    deliveryChargeCents: integer("delivery_charge_cents").notNull(),
    fuelCostCents: integer("fuel_cost_cents").notNull(),
    // NOT NULL + UNIQUE: every planet has exactly one manager.
    managerId: text("manager_id")
      .notNull()
      .unique()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("planets_days_from_earth_positive", sql`${t.daysFromEarth} > 0`),
    check(
      "planets_delivery_charge_range",
      sql`${t.deliveryChargeCents} between 0 and ${sql.raw(MAX_CENTS)}`,
    ),
    check("planets_fuel_cost_range", sql`${t.fuelCostCents} between 0 and ${sql.raw(MAX_CENTS)}`),
  ],
);

export const sectors = pgTable(
  "sectors",
  {
    id: id(),
    planetId: uuid("planet_id")
      .notNull()
      .references(() => planets.id),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("sectors_planet_name_unique").on(t.planetId, t.name),
    // Target of the composite FK from divisions.
    unique("sectors_id_planet_unique").on(t.id, t.planetId),
  ],
);

export const divisions = pgTable(
  "divisions",
  {
    id: id(),
    sectorId: uuid("sector_id").notNull(),
    planetId: uuid("planet_id").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // A division's planet must be its sector's planet.
    foreignKey({
      name: "divisions_sector_planet_fk",
      columns: [t.sectorId, t.planetId],
      foreignColumns: [sectors.id, sectors.planetId],
    }),
    unique("divisions_sector_name_unique").on(t.sectorId, t.name),
    // Target of the composite FK from orders.
    unique("divisions_id_planet_unique").on(t.id, t.planetId),
  ],
);
