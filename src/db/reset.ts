import { sql } from "drizzle-orm";
import type { db as database } from "./index";

// TRUNCATE skips the append-only row triggers, so this is the one way to wipe history.
export async function truncateAll(db: typeof database) {
  await db.execute(sql`
    truncate table
      order_events, order_items, orders, trips, settings_changes,
      divisions, sectors, planets, products,
      session, account, verification, "user"
    restart identity cascade
  `);
}
