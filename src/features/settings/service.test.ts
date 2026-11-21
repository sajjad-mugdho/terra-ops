import { asc, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { planets, products, settingsChanges, user } from "@/db/schema";
import { getMyOrder, getPlanetOrder } from "@/features/orders/service";
import { addOrderToTrip, createTrip, getMyOpenTrip, listPlanetsForTrip } from "@/features/trips/service";
import { seedReference } from "@/seed/reference";
import {
  acceptAs,
  ADMIRAL,
  ALL_ACTORS,
  CAPTAIN,
  clearOrders,
  CUSTOMER,
  MARS_D7,
  MARS_MANAGER,
  OTHER_CAPTAIN,
  placeItems,
  planetId,
  planTrip,
  productId,
  resetSettings,
} from "@/test/orders";
import { actAsNobody, signInAll, switchTo } from "@/test/session";
import {
  listPlanetsForAdmiral,
  listProducts,
  listProductsForAdmiral,
  updatePlanetCharges,
  updateProduct,
} from "./service";

const OTHERS = [CUSTOMER, MARS_MANAGER, CAPTAIN];

beforeAll(async () => {
  await seedReference();
  await signInAll(ALL_ACTORS);
});

beforeEach(async () => {
  await clearOrders();
  await resetSettings();
});

async function history() {
  return db
    .select({
      field: settingsChanges.field,
      oldValueCents: settingsChanges.oldValueCents,
      newValueCents: settingsChanges.newValueCents,
      actor: user.email,
      productId: settingsChanges.productId,
      planetId: settingsChanges.planetId,
    })
    .from(settingsChanges)
    .innerJoin(user, eq(user.id, settingsChanges.actorId))
    .orderBy(asc(settingsChanges.changedAt), asc(settingsChanges.field));
}

describe("listProducts", () => {
  it("throws UNAUTHORIZED without a session", async () => {
    actAsNobody();
    await expect(listProducts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each(OTHERS)("gives %s the price but no making cost", async (email) => {
    switchTo(email);
    const list = await listProducts();

    expect(list.map((product) => product.name)).toEqual(["Food", "Machines", "Oxygen", "Plants", "Water"]);
    for (const product of list) {
      expect(Object.keys(product).sort()).toEqual(["id", "name", "priceCents"]);
    }
    expect(list.find((product) => product.name === "Water")?.priceCents).toBe(1000);
  });
});

describe("listProductsForAdmiral", () => {
  it("gives the Admiral price, making cost and margin of the 5 products", async () => {
    switchTo(ADMIRAL);
    const list = await listProductsForAdmiral();

    expect(list).toHaveLength(5);
    expect(list.find((product) => product.name === "Water")).toMatchObject({
      priceCents: 1000,
      makingCostCents: 600,
      marginCents: 400,
      sellsAtLoss: false,
    });
    expect(list.find((product) => product.name === "Machines")?.marginCents).toBe(1800);
  });

  it.each(OTHERS)("is FORBIDDEN for %s", async (email) => {
    switchTo(email);
    await expect(listProductsForAdmiral()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("is UNAUTHORIZED without a session", async () => {
    actAsNobody();
    await expect(listProductsForAdmiral()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("updateProduct", () => {
  it("saves both values and writes one history row per changed field", async () => {
    const water = await productId("Water");
    const before = new Date();
    switchTo(ADMIRAL);
    await expect(updateProduct(water, { priceCents: 1200, makingCostCents: 700 })).resolves.toEqual({
      changed: true,
    });

    expect(await history()).toEqual([
      { field: "price", oldValueCents: 1000, newValueCents: 1200, actor: ADMIRAL, productId: water, planetId: null },
      { field: "making_cost", oldValueCents: 600, newValueCents: 700, actor: ADMIRAL, productId: water, planetId: null },
    ]);
    for (const row of await db.select({ changedAt: settingsChanges.changedAt }).from(settingsChanges)) {
      expect(row.changedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(row.changedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    }
    expect((await listProductsForAdmiral()).find((product) => product.id === water)).toMatchObject({
      priceCents: 1200,
      makingCostCents: 700,
      marginCents: 500,
    });
  });

  it("writes one row when only the price changed", async () => {
    const water = await productId("Water");
    switchTo(ADMIRAL);
    await updateProduct(water, { priceCents: 1100, makingCostCents: 600 });
    expect((await history()).map((row) => row.field)).toEqual(["price"]);
  });

  it("writes nothing and says so when nothing changed", async () => {
    const water = await productId("Water");
    const [before] = await db.select().from(products).where(eq(products.id, water));
    switchTo(ADMIRAL);
    await expect(updateProduct(water, { priceCents: 1000, makingCostCents: 600 })).resolves.toEqual({
      changed: false,
    });

    expect(await history()).toEqual([]);
    const [after] = await db.select().from(products).where(eq(products.id, water));
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  it("saves a price below the making cost and flags the loss", async () => {
    const water = await productId("Water");
    switchTo(ADMIRAL);
    await updateProduct(water, { priceCents: 500, makingCostCents: 600 });
    expect((await listProductsForAdmiral()).find((product) => product.id === water)).toMatchObject({
      marginCents: -100,
      sellsAtLoss: true,
    });
  });

  it("saves a price of 0 and the $1,000,000 cap", async () => {
    const water = await productId("Water");
    switchTo(ADMIRAL);
    await updateProduct(water, { priceCents: 0, makingCostCents: 100_000_000 });
    expect((await listProductsForAdmiral()).find((product) => product.id === water)).toMatchObject({
      priceCents: 0,
      makingCostCents: 100_000_000,
    });
  });

  it.each([
    { priceCents: -1, makingCostCents: 600 },
    { priceCents: 1000, makingCostCents: -1 },
    { priceCents: 10.5, makingCostCents: 600 },
    { priceCents: 100_000_001, makingCostCents: 600 },
    { priceCents: Number.NaN, makingCostCents: 600 },
  ])("refuses %j as INVALID and changes nothing", async (values) => {
    const water = await productId("Water");
    switchTo(ADMIRAL);
    await expect(updateProduct(water, values)).rejects.toMatchObject({ code: "INVALID" });
    expect(await history()).toEqual([]);
  });

  it("is NOT_FOUND for an unknown product", async () => {
    switchTo(ADMIRAL);
    const values = { priceCents: 1, makingCostCents: 1 };
    await expect(updateProduct(await planetId("Mars"), values)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateProduct("abc", values)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each(OTHERS)("is FORBIDDEN for %s and changes nothing", async (email) => {
    const water = await productId("Water");
    switchTo(email);
    await expect(updateProduct(water, { priceCents: 1, makingCostCents: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(await history()).toEqual([]);
    expect((await listProducts()).find((product) => product.id === water)?.priceCents).toBe(1000);
  });

  it("is UNAUTHORIZED without a session", async () => {
    const water = await productId("Water");
    actAsNobody();
    await expect(updateProduct(water, { priceCents: 1, makingCostCents: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps both changes in the history when two tabs save at once", async () => {
    const water = await productId("Water");
    switchTo(ADMIRAL);
    await Promise.all([
      updateProduct(water, { priceCents: 1100, makingCostCents: 600 }),
      updateProduct(water, { priceCents: 1300, makingCostCents: 600 }),
    ]);

    const rows = await history();
    const [{ priceCents }] = await db.select().from(products).where(eq(products.id, water));
    expect(rows).toHaveLength(2);
    // Each old value is the value the other save left, so the chain has no gap.
    const first = rows.find((row) => row.oldValueCents === 1000);
    const second = rows.find((row) => row.oldValueCents !== 1000);
    expect(second?.oldValueCents).toBe(first?.newValueCents);
    expect(second?.newValueCents).toBe(priceCents);
  });

  it("shows the new price at checkout and leaves a placed order untouched", async () => {
    const water = await productId("Water");
    const placed = await placeItems({ Water: 3 }, await MARS_D7());
    const before = await getMyOrder(placed.id);

    switchTo(ADMIRAL);
    await updateProduct(water, { priceCents: 2500, makingCostCents: 2000 });

    switchTo(CUSTOMER);
    expect((await listProducts()).find((product) => product.id === water)?.priceCents).toBe(2500);
    const after = await getMyOrder(placed.id);
    expect(after).toEqual(before);
    expect(after).toMatchObject({ productAmountCents: 3000, deliveryChargesCents: 1500, totalCents: 4500 });

    const next = await placeItems({ Water: 3 }, await MARS_D7());
    expect(await getMyOrder(next.id)).toMatchObject({ productAmountCents: 7500, totalCents: 9000 });
  });
});

describe("listPlanetsForAdmiral", () => {
  it("lists the 7 planets with the units needed to cover the fuel", async () => {
    switchTo(ADMIRAL);
    const list = await listPlanetsForAdmiral();

    expect(list.map((planet) => planet.name)).toEqual([
      "Venus",
      "Mercury",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
    ]);
    expect(list.find((planet) => planet.name === "Mars")).toMatchObject({
      daysFromEarth: 4,
      deliveryChargeCents: 500,
      fuelCostCents: 4000,
      unitsToCoverFuel: 8,
    });
    expect(list.find((planet) => planet.name === "Venus")?.unitsToCoverFuel).toBe(9);
  });

  it("says a planet with a delivery charge of 0 never covers its fuel", async () => {
    switchTo(ADMIRAL);
    await updatePlanetCharges(await planetId("Mars"), { deliveryChargeCents: 0, fuelCostCents: 4000 });
    expect((await listPlanetsForAdmiral()).find((planet) => planet.name === "Mars")?.unitsToCoverFuel).toBeNull();
  });

  it.each(OTHERS)("is FORBIDDEN for %s", async (email) => {
    switchTo(email);
    await expect(listPlanetsForAdmiral()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("updatePlanetCharges", () => {
  it("saves both values and writes one history row per changed field", async () => {
    const mars = await planetId("Mars");
    switchTo(ADMIRAL);
    await expect(
      updatePlanetCharges(mars, { deliveryChargeCents: 700, fuelCostCents: 4500 }),
    ).resolves.toEqual({ changed: true });

    expect(await history()).toEqual([
      { field: "delivery_charge", oldValueCents: 500, newValueCents: 700, actor: ADMIRAL, productId: null, planetId: mars },
      { field: "fuel_cost", oldValueCents: 4000, newValueCents: 4500, actor: ADMIRAL, productId: null, planetId: mars },
    ]);
  });

  it("writes one row when only the fuel cost changed, and none when nothing did", async () => {
    const mars = await planetId("Mars");
    switchTo(ADMIRAL);
    await updatePlanetCharges(mars, { deliveryChargeCents: 500, fuelCostCents: 4100 });
    expect((await history()).map((row) => row.field)).toEqual(["fuel_cost"]);

    await expect(
      updatePlanetCharges(mars, { deliveryChargeCents: 500, fuelCostCents: 4100 }),
    ).resolves.toEqual({ changed: false });
    expect(await history()).toHaveLength(1);
  });

  it("never changes days from Earth", async () => {
    const mars = await planetId("Mars");
    switchTo(ADMIRAL);
    await updatePlanetCharges(mars, { deliveryChargeCents: 1, fuelCostCents: 1 });
    const [planet] = await db.select().from(planets).where(eq(planets.id, mars));
    expect(planet.daysFromEarth).toBe(4);
  });

  it.each([
    { deliveryChargeCents: -1, fuelCostCents: 4000 },
    { deliveryChargeCents: 500, fuelCostCents: 0.5 },
    { deliveryChargeCents: 500, fuelCostCents: 100_000_001 },
  ])("refuses %j as INVALID", async (values) => {
    switchTo(ADMIRAL);
    await expect(updatePlanetCharges(await planetId("Mars"), values)).rejects.toMatchObject({
      code: "INVALID",
    });
    expect(await history()).toEqual([]);
  });

  it("is NOT_FOUND for an unknown planet", async () => {
    switchTo(ADMIRAL);
    const values = { deliveryChargeCents: 1, fuelCostCents: 1 };
    await expect(updatePlanetCharges(await productId("Water"), values)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(updatePlanetCharges("mars", values)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each(OTHERS)("is FORBIDDEN for %s", async (email) => {
    const mars = await planetId("Mars");
    switchTo(email);
    await expect(
      updatePlanetCharges(mars, { deliveryChargeCents: 1, fuelCostCents: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await history()).toEqual([]);
  });

  it("uses the new delivery charge for a new order and keeps the old one on a placed order", async () => {
    const mars = await planetId("Mars");
    const placed = await placeItems({ Water: 4 }, await MARS_D7());

    switchTo(ADMIRAL);
    await updatePlanetCharges(mars, { deliveryChargeCents: 900, fuelCostCents: 4000 });

    const next = await placeItems({ Water: 4 }, await MARS_D7());
    expect(await getMyOrder(placed.id)).toMatchObject({ deliveryChargesCents: 2000, totalCents: 6000 });
    expect(await getMyOrder(next.id)).toMatchObject({ deliveryChargesCents: 3600, totalCents: 7600 });
    switchTo(MARS_MANAGER);
    expect(await getPlanetOrder(placed.id)).toMatchObject({ deliveryChargesCents: 2000 });
  });

  it("pays the captain the order's frozen charge when the charge changed before it was assigned", async () => {
    const mars = await planetId("Mars");
    const placed = await placeItems({ Water: 4 }, await MARS_D7());
    await acceptAs(MARS_MANAGER, placed.id);

    switchTo(ADMIRAL);
    await updatePlanetCharges(mars, { deliveryChargeCents: 900, fuelCostCents: 4000 });

    await planTrip(CAPTAIN, "Mars", [placed.id]);
    expect((await getMyOpenTrip())?.orders[0].deliveryChargesCents).toBe(2000);
  });

  it("uses the new fuel cost for a new trip and keeps the old one on a PLANNING trip", async () => {
    const mars = await planetId("Mars");
    const placed = await placeItems({ Water: 4 }, await MARS_D7());
    await acceptAs(MARS_MANAGER, placed.id);
    await planTrip(CAPTAIN, "Mars", []);

    switchTo(ADMIRAL);
    await updatePlanetCharges(mars, { deliveryChargeCents: 500, fuelCostCents: 9900 });

    switchTo(CAPTAIN);
    const open = await getMyOpenTrip();
    expect(open?.fuelCostCents).toBe(4000);
    await addOrderToTrip(open?.id ?? "", placed.id);
    expect((await getMyOpenTrip())?.fuelCostCents).toBe(4000);

    switchTo(OTHER_CAPTAIN);
    expect((await listPlanetsForTrip()).find((planet) => planet.id === mars)?.fuelCostCents).toBe(9900);
    await createTrip(mars);
    expect((await getMyOpenTrip())?.fuelCostCents).toBe(9900);
  });
});
