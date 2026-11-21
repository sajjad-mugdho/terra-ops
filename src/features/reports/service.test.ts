import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { rejectOrder } from "@/features/orders/service";
import { updateProduct } from "@/features/settings/service";
import { cancelTrip, listMyTrips, markLiftedOff, markLoaded } from "@/features/trips/service";
import { seedReference } from "@/seed/reference";
import {
  acceptAs,
  ADMIRAL,
  ALL_ACTORS,
  CAPTAIN,
  clearOrders,
  CUSTOMER,
  deepKeys,
  flyTrip,
  MARS_D7,
  MARS_D8,
  MARS_MANAGER,
  MARS_T1,
  OTHER_CAPTAIN,
  OTHER_CUSTOMER,
  placeItems,
  planTrip,
  productId,
  resetSettings,
  VENUS_D1,
  VENUS_MANAGER,
} from "@/test/orders";
import { actAsNobody, signInAll, switchTo } from "@/test/session";
import { parseRange } from "./range";
import {
  getCompanyTotals,
  getMyEarnings,
  getPipeline,
  getPlanetInProgress,
  getPlanetProductTable,
  getPlanetProfitSummary,
  getPlanetPurchases,
} from "./service";

const DAY = 86_400_000;
const around = () => ({ start: new Date(Date.now() - DAY), end: new Date(Date.now() + DAY) });
const ZERO = { units: 0, revenueCents: 0, makingCostCents: 0, profitCents: 0 };
const NOTHING = { units: 0, productAmountCents: 0, deliveryChargesCents: 0, totalPaidCents: 0 };

async function delivered(
  items: Record<string, number>,
  division: string,
  manager = MARS_MANAGER,
  customer = CUSTOMER,
) {
  const order = await placeItems(items, division, customer);
  await acceptAs(manager, order.id);
  return order;
}

// Mars: 3 Water + 1 Machines, and 4 Food. Venus: 5 Water. All delivered.
// Not delivered on Mars: 1 PLACED, 1 REJECTED, 2 Water ACCEPTED, 6 Oxygen LIFTED_OFF.
async function knownSet() {
  await clearOrders();
  await resetSettings();
  const first = await delivered({ Water: 3, Machines: 1 }, await MARS_D7());
  const second = await delivered({ Food: 4 }, await MARS_T1(), MARS_MANAGER, OTHER_CUSTOMER);
  const venus = await delivered({ Water: 5 }, await VENUS_D1(), VENUS_MANAGER);
  await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [first.id, second.id]));
  await flyTrip(OTHER_CAPTAIN, await planTrip(OTHER_CAPTAIN, "Venus", [venus.id]));

  await placeItems({ Water: 1 }, await MARS_D7());
  const refused = await placeItems({ Water: 1 }, await MARS_D7());
  switchTo(MARS_MANAGER);
  await rejectOrder(refused.id, "Out of stock");
  await delivered({ Water: 2 }, await MARS_D8());
  const flying = await delivered({ Oxygen: 6 }, await MARS_D7());
  const tripId = await planTrip(CAPTAIN, "Mars", [flying.id]);
  await markLoaded(tripId);
  await markLiftedOff(tripId);
}

beforeAll(async () => {
  await seedReference();
  await signInAll(ALL_ACTORS);
});

describe("Admiral dashboard on a known set", () => {
  beforeAll(knownSet);

  it("adds up units, revenue, making cost and profit of delivered orders only", async () => {
    switchTo(ADMIRAL);
    expect(await getCompanyTotals(around())).toEqual({
      unitsDelivered: 13,
      revenueCents: 18800,
      makingCostCents: 11800,
      profitCents: 7000,
    });
  });

  it("lists every planet, highest profit first, ties by name, zero planets included", async () => {
    switchTo(ADMIRAL);
    const summary = await getPlanetProfitSummary(around());

    expect(summary.map((row) => row.planet)).toEqual([
      "Mars",
      "Venus",
      "Jupiter",
      "Mercury",
      "Neptune",
      "Saturn",
      "Uranus",
    ]);
    expect(summary[0]).toMatchObject({ units: 8, revenueCents: 13800, makingCostCents: 8800, profitCents: 5000 });
    expect(summary[1]).toMatchObject({ units: 5, revenueCents: 5000, makingCostCents: 3000, profitCents: 2000 });
    for (const row of summary.slice(2)) expect(row).toMatchObject(ZERO);
  });

  it("gives every cell of the planet by product table", async () => {
    switchTo(ADMIRAL);
    const table = await getPlanetProductTable(around());
    const mars = table.find((planet) => planet.planet === "Mars");
    const venus = table.find((planet) => planet.planet === "Venus");

    expect(mars?.rows).toEqual([
      { product: "Food", units: 4, revenueCents: 4800, makingCostCents: 2800, profitCents: 2000 },
      { product: "Machines", units: 1, revenueCents: 6000, makingCostCents: 4200, profitCents: 1800 },
      { product: "Oxygen", ...ZERO },
      { product: "Plants", ...ZERO },
      { product: "Water", units: 3, revenueCents: 3000, makingCostCents: 1800, profitCents: 1200 },
    ]);
    expect(venus?.rows.filter((row) => row.units > 0)).toEqual([
      { product: "Water", units: 5, revenueCents: 5000, makingCostCents: 3000, profitCents: 2000 },
    ]);
    for (const planet of table) expect(planet.rows).toHaveLength(5);
    expect(table.find((planet) => planet.planet === "Saturn")?.subtotal).toEqual(ZERO);
  });

  it("keeps the table in the summary's order, with subtotals equal to the summary rows", async () => {
    switchTo(ADMIRAL);
    const [totals, summary, table] = await Promise.all([
      getCompanyTotals(around()),
      getPlanetProfitSummary(around()),
      getPlanetProductTable(around()),
    ]);

    expect(table.map((planet) => planet.planet)).toEqual(summary.map((row) => row.planet));
    expect(table.map((planet) => ({ planetId: planet.planetId, planet: planet.planet, ...planet.subtotal }))).toEqual(summary);

    const add = (key: keyof typeof ZERO) => table.reduce((sum, planet) => sum + planet.subtotal[key], 0);
    expect(add("units")).toBe(totals.unitsDelivered);
    expect(add("revenueCents")).toBe(totals.revenueCents);
    expect(add("makingCostCents")).toBe(totals.makingCostCents);
    expect(add("profitCents")).toBe(totals.profitCents);
    for (const planet of table) {
      expect(planet.rows.reduce((sum, row) => sum + row.profitCents, 0)).toBe(planet.subtotal.profitCents);
    }
  });

  it("counts all 9 statuses in the pipeline, whatever the range", async () => {
    switchTo(ADMIRAL);
    expect(await getPipeline()).toEqual([
      { status: "PLACED", count: 1 },
      { status: "ACCEPTED", count: 1 },
      { status: "REJECTED", count: 1 },
      { status: "ASSIGNED", count: 0 },
      { status: "LOADED", count: 0 },
      { status: "LIFTED_OFF", count: 1 },
      { status: "LANDED", count: 0 },
      { status: "AT_SECTOR", count: 0 },
      { status: "DELIVERED", count: 3 },
    ]);
  });

  it("shows zeros for a range with no deliveries, with every planet still listed", async () => {
    switchTo(ADMIRAL);
    const empty = parseRange("2020-01-01", "2020-01-31");
    expect(await getCompanyTotals(empty)).toEqual({
      unitsDelivered: 0,
      revenueCents: 0,
      makingCostCents: 0,
      profitCents: 0,
    });
    const summary = await getPlanetProfitSummary(empty);
    expect(summary.map((row) => row.planet)).toEqual([
      "Jupiter",
      "Mars",
      "Mercury",
      "Neptune",
      "Saturn",
      "Uranus",
      "Venus",
    ]);
    expect((await getPlanetProductTable(empty)).every((planet) => planet.subtotal.units === 0)).toBe(true);
  });

  it("does not move when a price and a making cost change afterwards", async () => {
    switchTo(ADMIRAL);
    const before = [
      await getCompanyTotals(around()),
      await getPlanetProfitSummary(around()),
      await getPlanetProductTable(around()),
    ];
    await updateProduct(await productId("Water"), { priceCents: 9900, makingCostCents: 100 });
    try {
      expect([
        await getCompanyTotals(around()),
        await getPlanetProfitSummary(around()),
        await getPlanetProductTable(around()),
      ]).toEqual(before);
      switchTo(MARS_MANAGER);
      expect((await getPlanetPurchases(around())).total.totalPaidCents).toBe(17800);
    } finally {
      await resetSettings();
    }
  });

  it.each([CUSTOMER, MARS_MANAGER, CAPTAIN])("is FORBIDDEN for %s", async (email) => {
    switchTo(email);
    await expect(getCompanyTotals(around())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getPlanetProfitSummary(around())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getPlanetProductTable(around())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getPipeline()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("is UNAUTHORIZED without a session", async () => {
    actAsNobody();
    await expect(getCompanyTotals(around())).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(getPipeline()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  describe("manager purchases", () => {
    it("gives units, product amount, delivery charges and total paid per product", async () => {
      switchTo(MARS_MANAGER);
      expect(await getPlanetPurchases(around())).toEqual({
        rows: [
          { product: "Food", units: 4, productAmountCents: 4800, deliveryChargesCents: 2000, totalPaidCents: 6800 },
          { product: "Machines", units: 1, productAmountCents: 6000, deliveryChargesCents: 500, totalPaidCents: 6500 },
          { product: "Oxygen", ...NOTHING },
          { product: "Plants", ...NOTHING },
          { product: "Water", units: 3, productAmountCents: 3000, deliveryChargesCents: 1500, totalPaidCents: 4500 },
        ],
        total: { units: 8, productAmountCents: 13800, deliveryChargesCents: 4000, totalPaidCents: 17800 },
      });
    });

    it("never mixes two planets", async () => {
      switchTo(VENUS_MANAGER);
      const venus = await getPlanetPurchases(around());
      expect(venus.total).toEqual({ units: 5, productAmountCents: 5000, deliveryChargesCents: 1500, totalPaidCents: 6500 });
      expect(venus.rows.filter((row) => row.units > 0).map((row) => row.product)).toEqual(["Water"]);
      expect((await getPlanetInProgress()).total).toEqual(NOTHING);
    });

    it("shows ACCEPTED to AT_SECTOR as in progress, without PLACED and REJECTED", async () => {
      switchTo(MARS_MANAGER);
      const progress = await getPlanetInProgress();
      expect(progress.rows.filter((row) => row.units > 0)).toEqual([
        { product: "Oxygen", units: 6, productAmountCents: 8400, deliveryChargesCents: 3000, totalPaidCents: 11400 },
        { product: "Water", units: 2, productAmountCents: 2000, deliveryChargesCents: 1000, totalPaidCents: 3000 },
      ]);
      expect(progress.rows).toHaveLength(5);
      expect(progress.total).toEqual({ units: 8, productAmountCents: 10400, deliveryChargesCents: 4000, totalPaidCents: 14400 });
    });

    it("has no cost, profit or margin key at any depth", async () => {
      switchTo(MARS_MANAGER);
      const keys = [...deepKeys(await getPlanetPurchases(around())), ...deepKeys(await getPlanetInProgress())];
      expect(keys).toContain("totalPaidCents");
      expect(keys.filter((key) => /cost|profit|margin|revenue/i.test(key))).toEqual([]);
    });

    it("agrees with the Admiral's revenue and the captain's earnings for the planet", async () => {
      switchTo(MARS_MANAGER);
      const { total } = await getPlanetPurchases(around());
      switchTo(ADMIRAL);
      const mars = (await getPlanetProfitSummary(around())).find((row) => row.planet === "Mars");
      switchTo(CAPTAIN);
      const flown = (await listMyTrips()).find((trip) => trip.status === "COMPLETED");

      expect(total.productAmountCents).toBe(mars?.revenueCents);
      expect(total.units).toBe(mars?.units);
      expect(total.deliveryChargesCents).toBe(flown?.earningsCents);
      expect(total.totalPaidCents).toBe((mars?.revenueCents ?? 0) + (flown?.earningsCents ?? 0));
    });

    it("shows zeros for a range with no deliveries, and keeps in progress as it is", async () => {
      switchTo(MARS_MANAGER);
      const empty = await getPlanetPurchases(parseRange("2020-01-01", "2020-01-31"));
      expect(empty.total).toEqual(NOTHING);
      expect(empty.rows).toHaveLength(5);
      expect((await getPlanetInProgress()).total.units).toBe(8);
    });

    it.each([CUSTOMER, CAPTAIN, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
      switchTo(email);
      await expect(getPlanetPurchases(around())).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(getPlanetInProgress()).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});

describe("range boundaries", () => {
  const day = parseRange("2030-01-10", "2030-01-10");

  async function deliveredAt(time: string) {
    await clearOrders();
    const order = await delivered({ Water: 2 }, await MARS_D7());
    await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [order.id]));
    await db.update(orders).set({ deliveredAt: new Date(time) }).where(eq(orders.id, order.id));
  }

  it.each([
    ["2030-01-10T00:00:00.000Z", 2],
    ["2030-01-10T23:59:59.999Z", 2],
    ["2030-01-09T23:59:59.999Z", 0],
    ["2030-01-11T00:00:00.000Z", 0],
  ])("an order delivered at %s counts %i units on 2030-01-10", async (time, units) => {
    await deliveredAt(time);
    switchTo(ADMIRAL);
    expect((await getCompanyTotals(day)).unitsDelivered).toBe(units);
    expect((await getPlanetProfitSummary(day)).find((row) => row.planet === "Mars")?.units).toBe(units);
    switchTo(MARS_MANAGER);
    expect((await getPlanetPurchases(day)).total.units).toBe(units);
  });

  it("moves an order from in progress to delivered, never in both", async () => {
    await clearOrders();
    const order = await delivered({ Water: 2 }, await MARS_D7());
    const tripId = await planTrip(CAPTAIN, "Mars", [order.id]);
    switchTo(MARS_MANAGER);
    expect((await getPlanetInProgress()).total.units).toBe(2);
    expect((await getPlanetPurchases(around())).total.units).toBe(0);

    await flyTrip(CAPTAIN, tripId);
    switchTo(MARS_MANAGER);
    expect((await getPlanetInProgress()).total.units).toBe(0);
    expect((await getPlanetPurchases(around())).total.units).toBe(2);
  });

  it("uses each order's own frozen price when the price changed inside the range", async () => {
    await clearOrders();
    const cheap = await delivered({ Water: 2 }, await MARS_D7());
    switchTo(ADMIRAL);
    await updateProduct(await productId("Water"), { priceCents: 500, makingCostCents: 600 });
    try {
      const dear = await delivered({ Water: 3 }, await MARS_D7());
      await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [cheap.id, dear.id]));

      switchTo(ADMIRAL);
      // 2 at $10 and 3 at $5, all made for $6: the second order sells at a loss.
      expect(await getCompanyTotals(around())).toEqual({
        unitsDelivered: 5,
        revenueCents: 3500,
        makingCostCents: 3000,
        profitCents: 500,
      });
    } finally {
      await resetSettings();
    }
  });

  it("shows a loss as a negative profit and ranks that planet last", async () => {
    await clearOrders();
    switchTo(ADMIRAL);
    await updateProduct(await productId("Water"), { priceCents: 500, makingCostCents: 600 });
    try {
      const order = await delivered({ Water: 3 }, await MARS_D7());
      await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [order.id]));

      switchTo(ADMIRAL);
      const summary = await getPlanetProfitSummary(around());
      expect(summary.at(-1)).toMatchObject({ planet: "Mars", profitCents: -300 });
      expect((await getPlanetProductTable(around())).at(-1)?.planet).toBe("Mars");
    } finally {
      await resetSettings();
    }
  });
});

describe("getMyEarnings", () => {
  const split = (units: number) => (units > 20 ? [20, units - 20] : [units]);

  async function marsTrip(captain: string, units: number) {
    const ids: string[] = [];
    for (const part of split(units)) ids.push((await delivered({ Water: part }, await MARS_D7())).id);
    return planTrip(captain, "Mars", ids);
  }

  it("works the two examples: 18 units earn $50, 5 units lose $15", async () => {
    await clearOrders();
    await flyTrip(CAPTAIN, await marsTrip(CAPTAIN, 18));
    switchTo(CAPTAIN);
    expect(await getMyEarnings()).toEqual({
      trips: 1,
      units: 18,
      earningsCents: 9000,
      fuelCents: 4000,
      profitCents: 5000,
    });

    await flyTrip(CAPTAIN, await marsTrip(CAPTAIN, 5));
    switchTo(CAPTAIN);
    expect(await getMyEarnings()).toEqual({
      trips: 2,
      units: 23,
      earningsCents: 11500,
      fuelCents: 8000,
      profitCents: 3500,
    });
    expect((await listMyTrips())[0]).toMatchObject({
      status: "COMPLETED",
      totalUnits: 5,
      earningsCents: 2500,
      fuelCostCents: 4000,
      profitCents: -1500,
    });
  });

  it("ignores open and cancelled trips, and other captains", async () => {
    await clearOrders();
    await flyTrip(CAPTAIN, await marsTrip(CAPTAIN, 10));
    switchTo(CAPTAIN);
    await cancelTrip(await marsTrip(CAPTAIN, 4));
    await marsTrip(CAPTAIN, 6);
    await flyTrip(OTHER_CAPTAIN, await marsTrip(OTHER_CAPTAIN, 20));

    switchTo(CAPTAIN);
    expect(await getMyEarnings()).toEqual({
      trips: 1,
      units: 10,
      earningsCents: 5000,
      fuelCents: 4000,
      profitCents: 1000,
    });
    switchTo(OTHER_CAPTAIN);
    expect(await getMyEarnings()).toMatchObject({ trips: 1, units: 20, profitCents: 6000 });
  });

  it("is all zeros before the first trip", async () => {
    await clearOrders();
    switchTo(CAPTAIN);
    expect(await getMyEarnings()).toEqual({ trips: 0, units: 0, earningsCents: 0, fuelCents: 0, profitCents: 0 });
  });

  it.each([CUSTOMER, MARS_MANAGER, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    switchTo(email);
    await expect(getMyEarnings()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
