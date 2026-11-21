import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, id, MAX_CENTS, updatedAt, utc } from "./columns";
import { settingField } from "./enums";
import { planets } from "./locations";

export const products = pgTable(
  "products",
  {
    id: id(),
    name: text("name").notNull().unique(),
    priceCents: integer("price_cents").notNull(),
    makingCostCents: integer("making_cost_cents").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("products_price_range", sql`${t.priceCents} between 0 and ${sql.raw(MAX_CENTS)}`),
    check(
      "products_making_cost_range",
      sql`${t.makingCostCents} between 0 and ${sql.raw(MAX_CENTS)}`,
    ),
  ],
);

export const settingsChanges = pgTable(
  "settings_changes",
  {
    id: id(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    productId: uuid("product_id").references(() => products.id),
    planetId: uuid("planet_id").references(() => planets.id),
    field: settingField("field").notNull(),
    oldValueCents: integer("old_value_cents").notNull(),
    newValueCents: integer("new_value_cents").notNull(),
    changedAt: utc("changed_at").notNull().defaultNow(),
  },
  (t) => [
    check("settings_changes_one_target", sql`num_nonnulls(${t.productId}, ${t.planetId}) = 1`),
    check(
      "settings_changes_field_matches_target",
      sql`(${t.productId} is not null and ${t.field} in ('price', 'making_cost')) or (${t.planetId} is not null and ${t.field} in ('delivery_charge', 'fuel_cost'))`,
    ),
    check(
      "settings_changes_values_range",
      sql`${t.oldValueCents} between 0 and ${sql.raw(MAX_CENTS)} and ${t.newValueCents} between 0 and ${sql.raw(MAX_CENTS)}`,
    ),
    check("settings_changes_value_changed", sql`${t.oldValueCents} <> ${t.newValueCents}`),
    index("settings_changes_changed_at_idx").on(t.changedAt),
    index("settings_changes_product_idx").on(t.productId),
    index("settings_changes_planet_idx").on(t.planetId),
  ],
);
