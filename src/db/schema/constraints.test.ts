import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { planets, products, sectors, user } from "@/db/schema";
import { seedReference } from "@/seed/reference";

const CHECK = "23514";
const UNIQUE = "23505";
const NOT_NULL = "23502";
const FOREIGN_KEY = "23503";

const rejected = (code: string, constraint?: string) => ({
  cause: constraint ? { code, constraint } : { code },
});

async function newUser(role = "manager") {
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Spare", email: `${id}@example.com`, role });
  return id;
}

const planet = (managerId: string) => ({
  name: `Planet ${managerId}`,
  daysFromEarth: 5,
  deliveryChargeCents: 500,
  fuelCostCents: 4000,
  managerId,
});

beforeAll(seedReference);

describe("planets", () => {
  it.each([0, -1])("rejects days_from_earth = %i", async (daysFromEarth) => {
    const values = { ...planet(await newUser()), daysFromEarth };
    await expect(db.insert(planets).values(values)).rejects.toMatchObject(
      rejected(CHECK, "planets_days_from_earth_positive"),
    );
  });

  it("rejects a negative delivery charge", async () => {
    const values = { ...planet(await newUser()), deliveryChargeCents: -1 };
    await expect(db.insert(planets).values(values)).rejects.toMatchObject(
      rejected(CHECK, "planets_delivery_charge_range"),
    );
  });

  it("rejects a negative fuel cost", async () => {
    const values = { ...planet(await newUser()), fuelCostCents: -1 };
    await expect(db.insert(planets).values(values)).rejects.toMatchObject(
      rejected(CHECK, "planets_fuel_cost_range"),
    );
  });

  it("rejects a planet without a manager", async () => {
    const values = { ...planet(randomUUID()), managerId: undefined as unknown as string };
    await expect(db.insert(planets).values(values)).rejects.toMatchObject(rejected(NOT_NULL));
  });

  it("rejects a manager who is not a user", async () => {
    await expect(db.insert(planets).values(planet(randomUUID()))).rejects.toMatchObject(
      rejected(FOREIGN_KEY),
    );
  });

  it("rejects a second planet for one manager", async () => {
    const [mars] = await db.select().from(planets).where(eq(planets.name, "Mars"));
    await expect(db.insert(planets).values(planet(mars.managerId))).rejects.toMatchObject(
      rejected(UNIQUE),
    );
  });

  it("accepts a valid planet", async () => {
    await expect(db.insert(planets).values(planet(await newUser()))).resolves.toBeDefined();
  });
});

describe("sectors", () => {
  it("rejects the same name twice on one planet, allows it on another planet", async () => {
    const [mars] = await db.select().from(planets).where(eq(planets.name, "Mars"));
    const [venus] = await db.select().from(planets).where(eq(planets.name, "Venus"));

    await expect(
      db.insert(sectors).values({ planetId: mars.id, name: "Olympus Sector" }),
    ).rejects.toMatchObject(rejected(UNIQUE, "sectors_planet_name_unique"));
    await expect(
      db.insert(sectors).values({ planetId: venus.id, name: "Olympus Sector" }),
    ).resolves.toBeDefined();
  });
});

describe("products", () => {
  it("rejects a negative price", async () => {
    await expect(
      db.insert(products).values({ name: "Bad price", priceCents: -1, makingCostCents: 0 }),
    ).rejects.toMatchObject(rejected(CHECK, "products_price_range"));
  });

  it("rejects a negative making cost", async () => {
    await expect(
      db.insert(products).values({ name: "Bad cost", priceCents: 0, makingCostCents: -1 }),
    ).rejects.toMatchObject(rejected(CHECK, "products_making_cost_range"));
  });

  it("rejects a duplicate name", async () => {
    await expect(
      db.insert(products).values({ name: "Water", priceCents: 1, makingCostCents: 1 }),
    ).rejects.toMatchObject(rejected(UNIQUE));
  });
});

describe("user", () => {
  it("rejects a role outside the four roles", async () => {
    await expect(newUser("emperor")).rejects.toMatchObject(rejected(CHECK, "user_role_valid"));
  });

  it("rejects a second account with the same email", async () => {
    await expect(
      db.insert(user).values({ id: randomUUID(), name: "Copy", email: "admiral@terra.demo" }),
    ).rejects.toMatchObject(rejected(UNIQUE));
  });
});
