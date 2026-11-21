import { timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();

export const utc = (name: string) => timestamp(name, { withTimezone: true });

export const createdAt = () => utc("created_at").notNull().defaultNow();

export const updatedAt = () =>
  utc("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// $1,000,000. Same cap as the money input validation.
export const MAX_CENTS = "100000000";
