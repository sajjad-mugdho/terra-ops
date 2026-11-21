import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { divisions, planets, products, sectors, user } from "@/db/schema";
import { DEMO_USERS } from "@/features/auth/demo-users";
import { seedReference } from "./reference";

beforeAll(async () => {
  await seedReference();
  // Twice on purpose: the seed must be repeatable.
  await seedReference();
});

describe("seedReference", () => {
  it("creates every demo user with the listed role", async () => {
    const rows = await db.select({ email: user.email, role: user.role }).from(user);
    expect(rows).toHaveLength(DEMO_USERS.length);
    for (const demo of DEMO_USERS) {
      expect(rows).toContainEqual({ email: demo.email, role: demo.role });
    }
  });

  it("gives every planet exactly one manager, and every manager exactly one planet", async () => {
    const rows = await db
      .select({ planet: planets.name, email: user.email, role: user.role })
      .from(planets)
      .innerJoin(user, eq(user.id, planets.managerId));
    const managers = DEMO_USERS.filter((demo) => demo.role === "manager");

    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.role === "manager")).toBe(true);
    for (const manager of managers) {
      expect(rows).toContainEqual({ planet: manager.planet, email: manager.email, role: "manager" });
    }
  });

  it("has 7 planets without Earth, 2 sectors each, 2 to 3 divisions each, and 5 products", async () => {
    const names = (await db.select({ name: planets.name }).from(planets)).map((row) => row.name);
    expect(names).toHaveLength(7);
    expect(names).not.toContain("Earth");

    const sectorCounts = await db
      .select({ planetId: sectors.planetId, count: sql<number>`count(*)::int` })
      .from(sectors)
      .groupBy(sectors.planetId);
    expect(sectorCounts.map((row) => row.count)).toEqual(Array(7).fill(2));

    const divisionCounts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(divisions)
      .groupBy(divisions.sectorId);
    expect(divisionCounts.every((row) => row.count === 2 || row.count === 3)).toBe(true);

    expect(await db.$count(products)).toBe(5);
  });

  it("includes Mars, Olympus Sector, Division 7", async () => {
    const rows = await db
      .select({ id: divisions.id })
      .from(divisions)
      .innerJoin(sectors, eq(sectors.id, divisions.sectorId))
      .innerJoin(planets, eq(planets.id, divisions.planetId))
      .where(
        sql`${planets.name} = 'Mars' and ${sectors.name} = 'Olympus Sector' and ${divisions.name} = 'Division 7'`,
      );
    expect(rows).toHaveLength(1);
  });
});
