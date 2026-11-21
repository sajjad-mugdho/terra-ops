import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { truncateAll } from "@/db/reset";
import { account, divisions, planets, products, sectors, user } from "@/db/schema";
import { DEMO_PASSWORD, DEMO_USERS } from "@/features/auth/demo-users";
import { auth } from "@/lib/auth";
import { PLANETS, PRODUCTS } from "./data";

// Wipes everything, then inserts users, locations and products.
export async function seedReference() {
  await truncateAll(db);

  // Hashed by Better Auth so sign-in accepts it. Hashed once: every demo user shares the password.
  const { password } = await auth.$context;
  const hash = await password.hash(DEMO_PASSWORD);
  const users = DEMO_USERS.map((demo) => ({ ...demo, id: randomUUID() }));
  await db.insert(user).values(users.map(({ id, name, email, role }) => ({ id, name, email, role })));
  await db.insert(account).values(
    users.map(({ id }) => ({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: hash,
      updatedAt: new Date(),
    })),
  );
  const userIdByEmail = new Map(users.map(({ email, id }) => [email, id]));

  for (const planet of PLANETS) {
    const manager = DEMO_USERS.find((demo) => demo.role === "manager" && demo.planet === planet.name);
    const managerId = manager && userIdByEmail.get(manager.email);
    if (!managerId) throw new Error(`No demo manager for ${planet.name}`);

    const { sectors: planetSectors, ...values } = planet;
    const [{ id: planetId }] = await db
      .insert(planets)
      .values({ ...values, managerId })
      .returning({ id: planets.id });

    for (const sector of planetSectors) {
      const [{ id: sectorId }] = await db
        .insert(sectors)
        .values({ planetId, name: sector.name })
        .returning({ id: sectors.id });
      await db
        .insert(divisions)
        .values(sector.divisions.map((name) => ({ sectorId, planetId, name })));
    }
  }

  await db.insert(products).values(PRODUCTS);
}
