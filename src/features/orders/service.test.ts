import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { orderEvents, orderItems, orders, planets, products, user } from "@/db/schema";
import { seedReference } from "@/seed/reference";
import {
  acceptAs,
  ADMIRAL,
  ALL_ACTORS,
  backdate,
  CAPTAIN,
  clearOrders,
  CUSTOMER,
  deepKeys,
  flyTrip,
  MARS_D7,
  MARS_MANAGER,
  OTHER_CUSTOMER,
  placeItems,
  placeWater,
  planetId,
  planTrip,
  acceptedWater,
  productId,
  timeline,
  VENUS_D1,
  VENUS_MANAGER,
} from "@/test/orders";
import { actAsNobody, signInAll, switchTo } from "@/test/session";
import {
  acceptOrder,
  getAnyOrder,
  getMyOrder,
  getPlanetOrder,
  listAllOrders,
  listMyOrders,
  listPlanetOrders,
  listQueue,
  placeOrder,
  rejectOrder,
} from "./service";

beforeAll(async () => {
  await seedReference();
  await signInAll(ALL_ACTORS);
});

beforeEach(clearOrders);

async function waterOrder(units: number, over: Record<string, unknown> = {}) {
  return {
    divisionId: await MARS_D7(),
    items: [{ productId: await productId("Water"), units }],
    expectedTotalCents: units * 1500,
    idempotencyKey: randomUUID(),
    ...over,
  };
}

const HIDDEN_FROM_STAFF = /cost|profit/i;

describe("placeOrder", () => {
  it("stores the order as PLACED and PAID with the planet of the division", async () => {
    switchTo(CUSTOMER);
    const placed = await placeOrder(await waterOrder(3));

    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    const [mars] = await db.select().from(planets).where(eq(planets.name, "Mars"));
    expect(placed.number).toBe(1001);
    expect(row).toMatchObject({
      status: "PLACED",
      paymentStatus: "PAID",
      totalUnits: 3,
      planetId: mars.id,
      tripId: null,
      acceptedAt: null,
    });
  });

  it("freezes the name, price, making cost and delivery charge on each line", async () => {
    switchTo(CUSTOMER);
    const placed = await placeOrder(
      await waterOrder(3, {
        items: [
          { productId: await productId("Water"), units: 3 },
          { productId: await productId("Machines"), units: 1 },
        ],
        expectedTotalCents: 3 * 1500 + 6500,
      }),
    );

    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, placed.id));
    expect(lines).toHaveLength(2);
    expect(lines.find((line) => line.productName === "Water")).toMatchObject({
      units: 3,
      unitPriceCents: 1000,
      unitMakingCostCents: 600,
      unitDeliveryChargeCents: 500,
    });
    expect(lines.find((line) => line.productName === "Machines")).toMatchObject({
      units: 1,
      unitPriceCents: 6000,
      unitMakingCostCents: 4200,
      unitDeliveryChargeCents: 500,
    });
  });

  it("writes one event: PLACED, by the customer", async () => {
    switchTo(CUSTOMER);
    const placed = await placeOrder(await waterOrder(1));
    expect(await timeline(placed.id)).toEqual([{ status: "PLACED", note: null, tripId: null }]);
  });

  it("accepts exactly 20 units", async () => {
    switchTo(CUSTOMER);
    const placed = await placeOrder(await waterOrder(20));
    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(row.totalUnits).toBe(20);
  });

  it.each([
    ["no lines", [], "Add at least one product"],
    ["only 0 units", [0], "Add at least one product"],
    ["21 units", [21], "An order can have at most 20 units"],
    ["two lines that pass 20 together", [11, 10], "An order can have at most 20 units"],
  ])("refuses %s", async (_, counts, message) => {
    switchTo(CUSTOMER);
    const water = await productId("Water");
    const input = await waterOrder(1, {
      items: counts.map((units) => ({ productId: water, units })),
    });
    await expect(placeOrder(input)).rejects.toMatchObject({ code: "INVALID", message });
    expect(await db.$count(orders)).toBe(0);
  });

  it("merges the same product sent in two lines", async () => {
    switchTo(CUSTOMER);
    const water = await productId("Water");
    const placed = await placeOrder(
      await waterOrder(5, {
        items: [
          { productId: water, units: 2 },
          { productId: water, units: 3 },
        ],
      }),
    );
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, placed.id));
    expect(lines).toHaveLength(1);
    expect(lines[0].units).toBe(5);
  });

  it("refuses an unknown product", async () => {
    switchTo(CUSTOMER);
    const input = await waterOrder(1, { items: [{ productId: randomUUID(), units: 1 }] });
    await expect(placeOrder(input)).rejects.toMatchObject({ code: "INVALID" });
    expect(await db.$count(orders)).toBe(0);
  });

  it.each([randomUUID(), "not-an-id"])("refuses the unknown division %s", async (divisionId) => {
    switchTo(CUSTOMER);
    const input = await waterOrder(1, { divisionId });
    await expect(placeOrder(input)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("ignores a planet and prices sent by the client", async () => {
    switchTo(CUSTOMER);
    const [venus] = await db.select().from(planets).where(eq(planets.name, "Venus"));
    const input = await waterOrder(2, { planetId: venus.id });
    Object.assign(input.items[0], { unitPriceCents: 1, unitDeliveryChargeCents: 0 });

    const placed = await placeOrder(input);
    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    const [line] = await db.select().from(orderItems).where(eq(orderItems.orderId, placed.id));
    expect(row.planetId).not.toBe(venus.id);
    expect(line.unitPriceCents).toBe(1000);
    expect(line.unitDeliveryChargeCents).toBe(500);
  });

  it("allows a product priced at $0 and still charges delivery", async () => {
    await db.update(products).set({ priceCents: 0 }).where(eq(products.name, "Plants"));
    try {
      switchTo(CUSTOMER);
      const input = await waterOrder(2, {
        items: [{ productId: await productId("Plants"), units: 2 }],
        expectedTotalCents: 1000,
      });
      const order = await getMyOrder((await placeOrder(input)).id);
      expect(order).toMatchObject({ productAmountCents: 0, deliveryChargesCents: 1000, totalCents: 1000 });
    } finally {
      await db.update(products).set({ priceCents: 1800 }).where(eq(products.name, "Plants"));
    }
  });

  describe("when a price changed after the page loaded", () => {
    it("blocks the order when the product price changed, then accepts the new total", async () => {
      switchTo(CUSTOMER);
      const input = await waterOrder(3);
      await db.update(products).set({ priceCents: 1100 }).where(eq(products.name, "Water"));
      try {
        await expect(placeOrder(input)).rejects.toMatchObject({
          code: "CONFLICT",
          message: "Prices changed. Please review the new total.",
        });
        expect(await db.$count(orders)).toBe(0);

        const placed = await placeOrder({ ...input, expectedTotalCents: 3 * 1600 });
        expect((await getMyOrder(placed.id)).totalCents).toBe(4800);
      } finally {
        await db.update(products).set({ priceCents: 1000 }).where(eq(products.name, "Water"));
      }
    });

    it("blocks the order when the delivery charge changed", async () => {
      switchTo(CUSTOMER);
      const input = await waterOrder(3);
      await db.update(planets).set({ deliveryChargeCents: 700 }).where(eq(planets.name, "Mars"));
      try {
        await expect(placeOrder(input)).rejects.toMatchObject({ code: "CONFLICT" });
        expect(await db.$count(orders)).toBe(0);
      } finally {
        await db.update(planets).set({ deliveryChargeCents: 500 }).where(eq(planets.name, "Mars"));
      }
    });
  });

  describe("idempotency key", () => {
    it("returns the same order when the key is sent twice", async () => {
      switchTo(CUSTOMER);
      const input = await waterOrder(3);
      const first = await placeOrder(input);
      const second = await placeOrder(input);

      expect(second).toEqual(first);
      expect(await db.$count(orders)).toBe(1);
      expect(await db.$count(orderItems)).toBe(1);
      expect(await db.$count(orderEvents)).toBe(1);
    });

    it("makes one order from a double click: two calls at the same moment", async () => {
      switchTo(CUSTOMER);
      const input = await waterOrder(3);
      const [first, second] = await Promise.all([placeOrder(input), placeOrder(input)]);

      expect(second).toEqual(first);
      expect(await db.$count(orders)).toBe(1);
      expect(await db.$count(orderItems)).toBe(1);
      expect(await db.$count(orderEvents)).toBe(1);
    });

    it("still returns the first order when prices changed before the resend", async () => {
      switchTo(CUSTOMER);
      const input = await waterOrder(3);
      const first = await placeOrder(input);
      await db.update(products).set({ priceCents: 1100 }).where(eq(products.name, "Water"));
      try {
        await expect(placeOrder(input)).resolves.toEqual(first);
      } finally {
        await db.update(products).set({ priceCents: 1000 }).where(eq(products.name, "Water"));
      }
    });

    it("never hands one customer's order to another customer with the same key", async () => {
      switchTo(CUSTOMER);
      const input = await waterOrder(3);
      const first = await placeOrder(input);

      switchTo(OTHER_CUSTOMER);
      const second = await placeOrder(input);
      expect(second.id).not.toBe(first.id);
      await expect(getMyOrder(first.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(((await listMyOrders()).rows).map((order) => order.id)).toEqual([second.id]);
    });
  });

  it.each([MARS_MANAGER, CAPTAIN, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    const input = await waterOrder(1);
    switchTo(email);
    await expect(placeOrder(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.$count(orders)).toBe(0);
  });

  it("is UNAUTHORIZED without a session", async () => {
    const input = await waterOrder(1);
    actAsNobody();
    await expect(placeOrder(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Please log in again",
    });
  });
});

describe("customer reads", () => {
  it("lists only the customer's own orders, newest first", async () => {
    const first = await placeWater(1);
    const second = await placeWater(2);
    switchTo(OTHER_CUSTOMER);
    const foreign = await placeOrder(await waterOrder(4));

    switchTo(CUSTOMER);
    const mine = (await listMyOrders()).rows;
    expect(mine.map((order) => order.id)).toEqual([second.id, first.id]);
    expect(mine[0]).toMatchObject({
      number: second.number,
      destination: { planet: "Mars", sector: "Olympus Sector", division: "Division 7" },
      totalUnits: 2,
      totalCents: 3000,
      status: "PLACED",
      paymentStatus: "PAID",
    });

    switchTo(OTHER_CUSTOMER);
    expect(((await listMyOrders()).rows).map((order) => order.id)).toEqual([foreign.id]);
  });

  it("returns an empty list for a customer with no orders", async () => {
    switchTo(CUSTOMER);
    expect((await listMyOrders()).rows).toEqual([]);
  });

  it("shows the detail with lines, totals and the timeline", async () => {
    const placed = await placeWater(3);
    const order = await getMyOrder(placed.id);

    expect(order).toMatchObject({
      number: placed.number,
      status: "PLACED",
      paymentStatus: "PAID",
      rejectReason: null,
      daysFromEarth: 4,
      totalUnits: 3,
      productAmountCents: 3000,
      deliveryChargesCents: 1500,
      totalCents: 4500,
      trip: null,
    });
    expect(order.items).toEqual([
      {
        productName: "Water",
        units: 3,
        unitPriceCents: 1000,
        unitDeliveryChargeCents: 500,
        lineTotalCents: 4500,
      },
    ]);
    expect(order.timeline.map((event) => event.label)).toEqual(["Order placed"]);
    expect(order.timeline[0].occurredAt).toBeInstanceOf(Date);
  });

  it("hides another customer's order: same answer as an order that does not exist", async () => {
    const placed = await placeWater(1);
    switchTo(OTHER_CUSTOMER);
    await expect(getMyOrder(placed.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getMyOrder(randomUUID())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("answers NOT_FOUND for a malformed ID instead of crashing", async () => {
    switchTo(CUSTOMER);
    await expect(getMyOrder("abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getMyOrder("'; drop table orders; --")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps showing the frozen prices after the price and the delivery charge change", async () => {
    const placed = await placeWater(3);
    await db.update(products).set({ priceCents: 9900 }).where(eq(products.name, "Water"));
    await db.update(planets).set({ deliveryChargeCents: 9900 }).where(eq(planets.name, "Mars"));
    try {
      switchTo(CUSTOMER);
      const order = await getMyOrder(placed.id);
      expect(order.totalCents).toBe(4500);
      expect(order.items[0]).toMatchObject({ unitPriceCents: 1000, unitDeliveryChargeCents: 500 });
      expect(((await listMyOrders()).rows)[0].totalCents).toBe(4500);
    } finally {
      await db.update(products).set({ priceCents: 1000 }).where(eq(products.name, "Water"));
      await db.update(planets).set({ deliveryChargeCents: 500 }).where(eq(planets.name, "Mars"));
    }
  });

  it("never returns making cost or profit to the customer", async () => {
    const placed = await placeWater(3);
    const keys = [...deepKeys(await getMyOrder(placed.id)), ...deepKeys((await listMyOrders()).rows)];
    expect(keys.filter((key) => HIDDEN_FROM_STAFF.test(key))).toEqual([]);
    expect(keys).not.toContain("customerName");
  });

  it.each([MARS_MANAGER, CAPTAIN, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    const placed = await placeWater(1);
    switchTo(email);
    await expect(listMyOrders()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getMyOrder(placed.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("listQueue", () => {
  it("shows only PLACED orders of the manager's planet, oldest first", async () => {
    const first = await placeWater(1);
    const second = await placeWater(2);
    const handled = await placeWater(3);
    const venus = await placeWater(4, await VENUS_D1(), "Venus");
    switchTo(MARS_MANAGER);
    await acceptOrder(handled.id);

    const queue = await listQueue();
    expect(queue.map((order) => order.id)).toEqual([first.id, second.id]);
    expect(queue[0]).toMatchObject({
      number: first.number,
      customerName: "Mira Chen",
      sector: "Olympus Sector",
      division: "Division 7",
      items: [{ productName: "Water", units: 1 }],
      totalUnits: 1,
      totalCents: 1500,
    });

    switchTo(VENUS_MANAGER);
    expect((await listQueue()).map((order) => order.id)).toEqual([venus.id]);
  });

  it("is empty when nothing waits", async () => {
    switchTo(MARS_MANAGER);
    expect(await listQueue()).toEqual([]);
  });

  it.each([CUSTOMER, CAPTAIN, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    switchTo(email);
    await expect(listQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("acceptOrder", () => {
  it("moves the order to ACCEPTED, sets accepted_at and adds an event", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await acceptOrder(placed.id);

    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(row.status).toBe("ACCEPTED");
    expect(row.paymentStatus).toBe("PAID");
    expect(row.acceptedAt).toBeInstanceOf(Date);
    expect((await timeline(placed.id)).map((event) => event.status)).toEqual(["PLACED", "ACCEPTED"]);
    expect(await listQueue()).toEqual([]);
  });

  it("shows the customer the new status on the next read", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await acceptOrder(placed.id);

    switchTo(CUSTOMER);
    const order = await getMyOrder(placed.id);
    expect(order.status).toBe("ACCEPTED");
    expect(order.timeline.map((event) => event.label)).toEqual(["Order placed", "Accepted by planet"]);
  });

  it("answers NOT_FOUND for an order of another planet and leaves it alone", async () => {
    const placed = await placeWater(3);
    switchTo(VENUS_MANAGER);
    await expect(acceptOrder(placed.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(rejectOrder(placed.id, "Not ours")).rejects.toMatchObject({ code: "NOT_FOUND" });

    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(row.status).toBe("PLACED");
    expect(await timeline(placed.id)).toHaveLength(1);
  });

  it.each([randomUUID(), "abc"])("answers NOT_FOUND for the unknown ID %s", async (id) => {
    switchTo(MARS_MANAGER);
    await expect(acceptOrder(id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fails the second accept with CONFLICT and adds no second event", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await acceptOrder(placed.id);
    await expect(acceptOrder(placed.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This order was already handled",
    });
    expect(await timeline(placed.id)).toHaveLength(2);
  });

  it("lets exactly one of two decisions made at the same moment win", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    const results = await Promise.allSettled([
      acceptOrder(placed.id),
      rejectOrder(placed.id, "Out of stock"),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected");
    expect(failed).toMatchObject({ reason: { code: "CONFLICT" } });
    expect(await timeline(placed.id)).toHaveLength(2);
  });

  it.each([CUSTOMER, CAPTAIN, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    const placed = await placeWater(1);
    switchTo(email);
    await expect(acceptOrder(placed.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(rejectOrder(placed.id, "No reason")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("rejectOrder", () => {
  it("sets REJECTED and REFUNDED together and keeps the reason", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await rejectOrder(placed.id, "  Out of stock  ");

    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(row).toMatchObject({
      status: "REJECTED",
      paymentStatus: "REFUNDED",
      rejectReason: "Out of stock",
      acceptedAt: null,
    });
    expect(await timeline(placed.id)).toEqual([
      { status: "PLACED", note: null, tripId: null },
      { status: "REJECTED", note: "Out of stock", tripId: null },
    ]);
  });

  it("shows the customer the reason and the refund", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await rejectOrder(placed.id, "<b>Out of stock</b>");

    switchTo(CUSTOMER);
    const order = await getMyOrder(placed.id);
    expect(order).toMatchObject({
      status: "REJECTED",
      paymentStatus: "REFUNDED",
      rejectReason: "<b>Out of stock</b>",
    });
    expect(order.timeline.at(-1)).toMatchObject({ label: "Rejected", note: "<b>Out of stock</b>" });
  });

  it("is final: a rejected order cannot be accepted or rejected again", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await rejectOrder(placed.id, "Out of stock");
    await expect(acceptOrder(placed.id)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(rejectOrder(placed.id, "Again")).rejects.toMatchObject({ code: "CONFLICT" });

    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(row.status).toBe("REJECTED");
  });

  it("cannot reject an order that was already accepted", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await acceptOrder(placed.id);
    await expect(rejectOrder(placed.id, "Changed my mind")).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This order was already handled",
    });
  });

  it.each(["", "  ", "no", "x".repeat(301)])("refuses the reason %j", async (reason) => {
    const placed = await placeWater(1);
    switchTo(MARS_MANAGER);
    await expect(rejectOrder(placed.id, reason)).rejects.toMatchObject({ code: "INVALID" });
    const [row] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(row.status).toBe("PLACED");
  });
});

describe("manager reads", () => {
  it("lists every order of the planet in any status, newest first", async () => {
    const placed = await placeWater(1);
    const accepted = await placeWater(2);
    const rejected = await placeWater(3);
    await placeWater(4, await VENUS_D1(), "Venus");
    switchTo(MARS_MANAGER);
    await acceptOrder(accepted.id);
    await rejectOrder(rejected.id, "Out of stock");

    const all = (await listPlanetOrders()).rows;
    expect(all.map((order) => [order.id, order.status])).toEqual([
      [rejected.id, "REJECTED"],
      [accepted.id, "ACCEPTED"],
      [placed.id, "PLACED"],
    ]);
    expect(all[0]).toMatchObject({ customerName: "Mira Chen", paymentStatus: "REFUNDED" });
  });

  it("shows the detail of an own-planet order with the customer name", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    const order = await getPlanetOrder(placed.id);
    expect(order).toMatchObject({ customerName: "Mira Chen", totalCents: 4500, status: "PLACED" });
    expect(order.timeline).toHaveLength(1);
  });

  it("answers NOT_FOUND for another planet's order, an unknown ID and a malformed ID", async () => {
    const placed = await placeWater(3);
    switchTo(VENUS_MANAGER);
    await expect(getPlanetOrder(placed.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getPlanetOrder(randomUUID())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getPlanetOrder("abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listPlanetOrders()).rows).toEqual([]);
  });

  it("never returns making cost or profit, at any depth", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    const keys = [
      ...deepKeys(await listQueue()),
      ...deepKeys((await listPlanetOrders()).rows),
      ...deepKeys(await getPlanetOrder(placed.id)),
    ];
    expect(keys.length).toBeGreaterThan(20);
    expect(keys.filter((key) => HIDDEN_FROM_STAFF.test(key))).toEqual([]);
  });

  it.each([CUSTOMER, CAPTAIN, ADMIRAL])("is FORBIDDEN for %s", async (email) => {
    const placed = await placeWater(1);
    switchTo(email);
    await expect(listPlanetOrders()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getPlanetOrder(placed.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Admiral orders", () => {
  async function threeOrders() {
    const mars = await placeItems({ Water: 3, Machines: 1 }, await MARS_D7());
    const venus = await placeItems({ Food: 2 }, await VENUS_D1(), OTHER_CUSTOMER);
    const refused = await placeWater(1);
    switchTo(MARS_MANAGER);
    await rejectOrder(refused.id, "Out of stock");
    return { mars, venus, refused };
  }

  it("lists every order of every planet and customer", async () => {
    await threeOrders();
    switchTo(ADMIRAL);
    const list = (await listAllOrders()).rows;

    expect(list.map((order) => [order.destination.planet, order.customerName, order.totalUnits, order.status, order.totalCents])).toEqual([
      ["Mars", "Mira Chen", 1, "REJECTED", 1500],
      ["Venus", "Jonas Okafor", 2, "PLACED", 3000],
      ["Mars", "Mira Chen", 4, "PLACED", 11000],
    ]);
  });

  it("filters by status and by planet, and ignores a bad planet ID", async () => {
    await threeOrders();
    switchTo(ADMIRAL);
    expect((await listAllOrders({ status: "REJECTED" })).rows).toHaveLength(1);
    expect((await listAllOrders({ planetId: await planetId("Venus") })).rows).toHaveLength(1);
    expect((await listAllOrders({ status: "PLACED", planetId: await planetId("Mars") })).rows).toHaveLength(1);
    expect((await listAllOrders({ status: "DELIVERED" })).rows).toEqual([]);
    expect((await listAllOrders({ planetId: "nope" })).rows).toHaveLength(3);
  });

  it("reads any order with making cost, profit and who did each step", async () => {
    const { mars } = await threeOrders();
    await acceptAs(MARS_MANAGER, mars.id);
    await flyTrip(CAPTAIN, await planTrip(CAPTAIN, "Mars", [mars.id]));

    switchTo(ADMIRAL);
    const order = await getAnyOrder(mars.id);
    expect(order).toMatchObject({
      customerName: "Mira Chen",
      status: "DELIVERED",
      productAmountCents: 9000,
      deliveryChargesCents: 2000,
      totalCents: 11000,
      makingCostCents: 6000,
      profitCents: 3000,
    });
    expect(order.items).toEqual([
      { productName: "Machines", units: 1, unitPriceCents: 6000, unitDeliveryChargeCents: 500, unitMakingCostCents: 4200, lineTotalCents: 6500 },
      { productName: "Water", units: 3, unitPriceCents: 1000, unitDeliveryChargeCents: 500, unitMakingCostCents: 600, lineTotalCents: 4500 },
    ]);
    expect(order.timeline.map((event) => [event.status, event.actorName])).toEqual([
      ["PLACED", "Mira Chen"],
      ["ACCEPTED", "Mars Manager"],
      ["ASSIGNED", "Captain Vega"],
      ["LOADED", "Captain Vega"],
      ["LIFTED_OFF", "Captain Vega"],
      ["LANDED", "Captain Vega"],
      ["AT_SECTOR", "Captain Vega"],
      ["DELIVERED", "Captain Vega"],
    ]);
  });

  it("keeps cost and profit of an order after the product changed", async () => {
    const { mars } = await threeOrders();
    await db.update(products).set({ priceCents: 1, makingCostCents: 9999 }).where(eq(products.name, "Water"));
    try {
      switchTo(ADMIRAL);
      expect(await getAnyOrder(mars.id)).toMatchObject({ makingCostCents: 6000, profitCents: 3000 });
    } finally {
      await db.update(products).set({ priceCents: 1000, makingCostCents: 600 }).where(eq(products.name, "Water"));
    }
  });

  it("is NOT_FOUND for an unknown order", async () => {
    switchTo(ADMIRAL);
    await expect(getAnyOrder(randomUUID())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getAnyOrder("abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([CUSTOMER, MARS_MANAGER, CAPTAIN])("is FORBIDDEN for %s", async (email) => {
    const { mars } = await threeOrders();
    switchTo(email);
    await expect(listAllOrders()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getAnyOrder(mars.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cannot place, accept or reject", async () => {
    const { mars } = await threeOrders();
    switchTo(ADMIRAL);
    await expect(placeOrder(await waterOrder(1))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(acceptOrder(mars.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(rejectOrder(mars.id, "Not allowed")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.$count(orders, eq(orders.status, "PLACED"))).toBe(2);
  });
});

describe("waiting time", () => {
  const DAY = 1440;
  const row = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0];

  it("counts a queued order from when it was placed", async () => {
    const placed = await placeWater(2);
    await backdate(placed.id, 2 * DAY + 300);
    switchTo(MARS_MANAGER);

    const [queued] = await listQueue();
    expect(queued.waitingSince).toEqual((await row(placed.id)).createdAt);
    expect(queued.waitingSince).toEqual(queued.createdAt);
  });

  it("sorts the queue by waiting time, oldest first, whatever the order number", async () => {
    const first = await placeWater(1);
    const second = await placeWater(2);
    await backdate(second.id, 5 * DAY);
    switchTo(MARS_MANAGER);
    expect((await listQueue()).map((order) => order.id)).toEqual([second.id, first.id]);
  });

  it("gives a manager the waiting start per status: placed, accepted, or none", async () => {
    const placed = await placeWater(1);
    const accepted = await acceptedWater(2);
    const refused = await placeWater(3);
    switchTo(MARS_MANAGER);
    await rejectOrder(refused.id, "Out of stock");
    const riding = await acceptedWater(4);
    await planTrip(CAPTAIN, "Mars", [riding.id]);
    await backdate(accepted.id, 9 * DAY, 4 * DAY);

    switchTo(MARS_MANAGER);
    const list = (await listPlanetOrders()).rows;
    const since = (id: string) => list.find((order) => order.id === id)?.waitingSince;
    expect(since(placed.id)).toEqual((await row(placed.id)).createdAt);
    expect(since(accepted.id)).toEqual((await row(accepted.id)).acceptedAt);
    expect(since(accepted.id)).not.toEqual((await row(accepted.id)).createdAt);
    expect(since(refused.id)).toBeNull();
    expect(since(riding.id)).toBeNull();
  });

  it("keeps the first accepted time when a captain puts an order back", async () => {
    const order = await acceptedWater(3);
    await backdate(order.id, 6 * DAY, 5 * DAY);
    const accepted = (await row(order.id)).acceptedAt;
    const tripId = await planTrip(CAPTAIN, "Mars", [order.id]);
    const { removeOrderFromTrip } = await import("@/features/trips/service");
    await removeOrderFromTrip(tripId, order.id);

    switchTo(MARS_MANAGER);
    expect(((await listPlanetOrders()).rows)[0]).toMatchObject({ status: "ACCEPTED", waitingSince: accepted });
  });

  it("never shows a manager the waiting orders of another planet", async () => {
    const venus = await placeWater(4, await VENUS_D1(), "Venus");
    await backdate(venus.id, 9 * DAY);
    switchTo(MARS_MANAGER);
    expect(await listQueue()).toEqual([]);
    expect((await listPlanetOrders()).rows).toEqual([]);
  });

  it("gives a customer no waiting time at all", async () => {
    const placed = await placeWater(3);
    await backdate(placed.id, 9 * DAY);
    switchTo(CUSTOMER);
    const keys = [...deepKeys(await getMyOrder(placed.id)), ...deepKeys((await listMyOrders()).rows)];
    expect(keys.filter((key) => /waiting|overdue/i.test(key))).toEqual([]);
  });

  it("adds no cost or profit to the manager lists", async () => {
    const placed = await placeWater(3);
    await backdate(placed.id, 9 * DAY);
    switchTo(MARS_MANAGER);
    const keys = [...deepKeys(await listQueue()), ...deepKeys((await listPlanetOrders()).rows)];
    expect(keys).toContain("waitingSince");
    expect(keys.filter((key) => HIDDEN_FROM_STAFF.test(key))).toEqual([]);
  });

  describe("Admiral list", () => {
    // Overdue: placedLong (4 days) and unpicked (accepted 3 days and 1 minute ago).
    async function waitingSet() {
      const placedLong = await placeWater(1);
      const placedShort = await placeWater(2);
      const unpicked = await acceptedWater(3);
      const justAccepted = await acceptedWater(4);
      const refused = await placeWater(5);
      switchTo(MARS_MANAGER);
      await rejectOrder(refused.id, "Out of stock");
      const riding = await acceptedWater(6);
      await planTrip(CAPTAIN, "Mars", [riding.id]);
      const venus = await placeWater(7, await VENUS_D1(), "Venus");

      await backdate(placedLong.id, 4 * DAY);
      await backdate(placedShort.id, 3 * DAY - 1);
      await backdate(unpicked.id, 10 * DAY, 3 * DAY + 1);
      // Placed long ago, accepted an hour ago: the wait for a captain has just started.
      await backdate(justAccepted.id, 10 * DAY, 60);
      await backdate(refused.id, 10 * DAY);
      await backdate(riding.id, 10 * DAY, 9 * DAY);
      await backdate(venus.id, 2 * DAY);
      return { placedLong, placedShort, unpicked, justAccepted, refused, riding, venus };
    }

    it("filters to exactly the orders that wait longer than 3 days", async () => {
      const set = await waitingSet();
      switchTo(ADMIRAL);
      const overdue = (await listAllOrders({ overdue: true })).rows;
      expect(overdue.map((order) => order.id).sort()).toEqual([set.placedLong.id, set.unpicked.id].sort());
      expect((await listAllOrders({ overdue: false })).rows).toHaveLength(7);
    });

    it("combines the overdue filter with status and planet", async () => {
      const set = await waitingSet();
      switchTo(ADMIRAL);
      expect(((await listAllOrders({ overdue: true, status: "ACCEPTED" })).rows).map((order) => order.id)).toEqual([set.unpicked.id]);
      expect((await listAllOrders({ overdue: true, planetId: await planetId("Venus") })).rows).toEqual([]);
      expect((await listAllOrders({ overdue: true, status: "DELIVERED" })).rows).toEqual([]);
    });

    it("sorts by longest waiting first and puts orders that do not wait last", async () => {
      const set = await waitingSet();
      switchTo(ADMIRAL);
      const sorted = (await listAllOrders({ sort: "waiting" })).rows;
      expect(sorted.slice(0, 5).map((order) => order.id)).toEqual([
        set.placedLong.id,
        set.unpicked.id,
        set.placedShort.id,
        set.venus.id,
        set.justAccepted.id,
      ]);
      expect(sorted.slice(5).map((order) => order.waitingSince)).toEqual([null, null]);
    });

    it("keeps newest first as the default order", async () => {
      const set = await waitingSet();
      switchTo(ADMIRAL);
      const byNewest = (await listAllOrders()).rows;
      expect(byNewest[0].id).toBe(set.venus.id);
      expect((await listAllOrders({ sort: "newest" })).rows).toEqual(byNewest);
    });

    it.each([CUSTOMER, MARS_MANAGER, CAPTAIN])("keeps the overdue list FORBIDDEN for %s", async (email) => {
      switchTo(email);
      await expect(listAllOrders({ overdue: true, sort: "waiting" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});

async function placeMany(count: number) {
  const ids: string[] = [];
  for (let index = 0; index < count; index++) ids.push((await placeWater(1)).id);
  return ids;
}

// Every page of a list, one after the other.
async function allPages<T>(list: (page: number) => Promise<{ rows: T[]; pageCount: number }>) {
  const first = await list(1);
  const pages = [first.rows];
  for (let page = 2; page <= first.pageCount; page++) pages.push((await list(page)).rows);
  return pages;
}

describe("pagination", () => {
  it("returns an empty first page for an empty list", async () => {
    switchTo(CUSTOMER);
    expect(await listMyOrders()).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
    switchTo(MARS_MANAGER);
    expect(await listPlanetOrders({ page: 3 })).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
    switchTo(ADMIRAL);
    expect(await listAllOrders({ page: 3 })).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
  });

  it("keeps exactly 20 rows on one page", async () => {
    await placeMany(20);
    const list = await listMyOrders();
    expect(list).toMatchObject({ total: 20, page: 1, pageCount: 1 });
    expect(list.rows).toHaveLength(20);
    // There is no page 2, so it shows the last page: page 1.
    expect(await listMyOrders({ page: 2 })).toEqual(list);
  });

  it("puts the 21st row on a second page, with no row repeated or missing", async () => {
    const ids = await placeMany(21);

    const [first, second] = await allPages((page) => listMyOrders({ page }));
    expect(first).toHaveLength(20);
    expect(second).toHaveLength(1);
    expect(await listMyOrders({ page: 2 })).toMatchObject({ total: 21, page: 2, pageCount: 2 });
    // Newest first: the pages together are every order, in reverse order of placing.
    expect([...first, ...second].map((order) => order.id)).toEqual([...ids].reverse());
  });

  it("shows the last page for a page past the end, and page 1 for a bad page", async () => {
    await placeMany(21);
    const last = await listMyOrders({ page: 2 });
    expect(await listMyOrders({ page: 999 })).toEqual(last);
    expect(await listMyOrders({ page: Number.POSITIVE_INFINITY })).toEqual(last);

    const first = await listMyOrders({ page: 1 });
    for (const page of [0, -3, Number.NaN]) expect(await listMyOrders({ page })).toEqual(first);
  });

  it("uses the order number as tie-breaker when orders share one time", async () => {
    await placeMany(45);
    await db.transaction(async (tx) => {
      await tx.execute(sql`alter table orders disable trigger orders_frozen_columns`);
      await tx.execute(sql`update orders set created_at = '2026-01-01T00:00:00Z'`);
      await tx.execute(sql`alter table orders enable trigger orders_frozen_columns`);
    });

    const pages = await allPages((page) => listMyOrders({ page }));
    expect(pages.map((rows) => rows.length)).toEqual([20, 20, 5]);
    const numbers = pages.flat().map((order) => order.number);
    expect(numbers).toEqual(Array.from({ length: 45 }, (_, index) => 1045 - index));
  });

  it("pages the manager's and the Admiral's lists the same way", async () => {
    const ids = await placeMany(21);
    await placeWater(1, await VENUS_D1(), "Venus");

    switchTo(MARS_MANAGER);
    const planet = await allPages((page) => listPlanetOrders({ page }));
    expect(planet.map((rows) => rows.length)).toEqual([20, 1]);
    expect(planet.flat().map((order) => order.id)).toEqual([...ids].reverse());
    expect((await listPlanetOrders()).total).toBe(21);

    switchTo(ADMIRAL);
    const all = await allPages((page) => listAllOrders({ page }));
    expect(all.map((rows) => rows.length)).toEqual([20, 2]);
    expect(new Set(all.flat().map((order) => order.id)).size).toBe(22);
    expect(await listAllOrders({ page: 2 })).toMatchObject({ total: 22, page: 2, pageCount: 2 });
  });

  it("counts and pages only the filtered rows", async () => {
    const ids = await placeMany(22);
    switchTo(MARS_MANAGER);
    await acceptOrder(ids[0]);

    const placed = await listPlanetOrders({ status: "PLACED", page: 2 });
    expect(placed).toMatchObject({ total: 21, page: 2, pageCount: 2 });
    expect(placed.rows.map((order) => order.id)).toEqual([ids[1]]);
    expect(await listPlanetOrders({ status: "ACCEPTED", page: 2 })).toMatchObject({ total: 1, page: 1, pageCount: 1 });
  });

  it("keeps the waiting sort stable across pages", async () => {
    const ids = await placeMany(21);
    switchTo(MARS_MANAGER);
    await rejectOrder(ids[5], "Out of stock");

    switchTo(ADMIRAL);
    const pages = await allPages((page) => listAllOrders({ page, sort: "waiting" }));
    const sorted = pages.flat().map((order) => order.id);
    // Longest waiting first, and the one order that does not wait comes last.
    expect(sorted).toEqual([...ids.filter((id) => id !== ids[5]), ids[5]]);
  });
});

describe("search and filters", () => {
  // Mira: ORD-1001 and ORD-1002 on Mars. Jonas: ORD-1003 on Mars, ORD-1004 on Venus.
  async function searchSet() {
    const mira1 = await placeWater(1);
    const mira2 = await placeWater(2);
    const jonas = await placeItems({ Water: 3 }, await MARS_D7(), OTHER_CUSTOMER);
    const venus = await placeItems({ Water: 4 }, await VENUS_D1(), OTHER_CUSTOMER);
    return { mira1, mira2, jonas, venus };
  }

  const numbers = (list: { rows: { number: number }[] }) => list.rows.map((order) => order.number);

  it("finds an order by its full or partial code, in any case", async () => {
    await searchSet();
    switchTo(CUSTOMER);
    expect(numbers(await listMyOrders({ q: "ORD-1002" }))).toEqual([1002]);
    expect(numbers(await listMyOrders({ q: "ord-1002" }))).toEqual([1002]);
    expect(numbers(await listMyOrders({ q: "1002" }))).toEqual([1002]);
    expect(numbers(await listMyOrders({ q: "D-100" }))).toEqual([1002, 1001]);
    expect(numbers(await listMyOrders({ q: "  ORD-1001  " }))).toEqual([1001]);
    expect(await listMyOrders({ q: "ORD-1002" })).toMatchObject({ total: 1, page: 1, pageCount: 1 });
  });

  it("returns nothing for a search with no match", async () => {
    await searchSet();
    switchTo(CUSTOMER);
    expect(await listMyOrders({ q: "ORD-9999" })).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
  });

  it("never lets a customer search by name or find another customer's order", async () => {
    await searchSet();
    switchTo(CUSTOMER);
    expect(numbers(await listMyOrders({ q: "Mira" }))).toEqual([]);
    expect(numbers(await listMyOrders({ q: "Jonas" }))).toEqual([]);
    expect(numbers(await listMyOrders({ q: "ORD-1003" }))).toEqual([]);
    expect(numbers(await listMyOrders({ q: "ORD" }))).toEqual([1002, 1001]);

    switchTo(OTHER_CUSTOMER);
    expect(numbers(await listMyOrders({ q: "ORD-1001" }))).toEqual([]);
    expect(numbers(await listMyOrders({ q: "100" }))).toEqual([1004, 1003]);
  });

  it("lets a manager search by code or customer name, inside the planet only", async () => {
    await searchSet();
    switchTo(MARS_MANAGER);
    expect(numbers(await listPlanetOrders({ q: "jonas" }))).toEqual([1003]);
    expect(numbers(await listPlanetOrders({ q: "MIRA CHEN" }))).toEqual([1002, 1001]);
    expect(numbers(await listPlanetOrders({ q: "ord-1003" }))).toEqual([1003]);
    // ORD-1004 is a Venus order: its code and its customer do not reach it from Mars.
    expect(numbers(await listPlanetOrders({ q: "ORD-1004" }))).toEqual([]);
    expect(numbers(await listPlanetOrders({ q: "Okafor" }))).toEqual([1003]);

    switchTo(VENUS_MANAGER);
    expect(numbers(await listPlanetOrders({ q: "ORD-1001" }))).toEqual([]);
    expect(numbers(await listPlanetOrders({ q: "Mira" }))).toEqual([]);
    expect(numbers(await listPlanetOrders({ q: "Jonas" }))).toEqual([1004]);
  });

  it("lets the Admiral search every planet by code or customer name", async () => {
    await searchSet();
    switchTo(ADMIRAL);
    expect(numbers(await listAllOrders({ q: "okafor" }))).toEqual([1004, 1003]);
    expect(numbers(await listAllOrders({ q: "ORD-1004" }))).toEqual([1004]);
    expect(numbers(await listAllOrders({ q: "Jonas", planetId: await planetId("Venus") }))).toEqual([1004]);
    expect(numbers(await listAllOrders({ q: "nobody" }))).toEqual([]);
  });

  it("combines search with status", async () => {
    const set = await searchSet();
    await acceptAs(MARS_MANAGER, set.mira1.id);

    expect(numbers(await listPlanetOrders({ q: "Mira", status: "ACCEPTED" }))).toEqual([1001]);
    expect(numbers(await listPlanetOrders({ q: "Mira", status: "PLACED" }))).toEqual([1002]);
    expect(numbers(await listPlanetOrders({ q: "Jonas", status: "ACCEPTED" }))).toEqual([]);
    expect(numbers(await listPlanetOrders({ status: "PLACED" }))).toEqual([1003, 1002]);

    switchTo(CUSTOMER);
    expect(numbers(await listMyOrders({ status: "ACCEPTED" }))).toEqual([1001]);
    expect(numbers(await listMyOrders({ q: "1002", status: "ACCEPTED" }))).toEqual([]);

    switchTo(ADMIRAL);
    expect(numbers(await listAllOrders({ q: "ORD-100", status: "PLACED", planetId: await planetId("Mars") }))).toEqual([1003, 1002]);
    expect(numbers(await listAllOrders({ q: "Mira", overdue: true }))).toEqual([]);
  });

  it("treats only spaces as no search", async () => {
    await searchSet();
    switchTo(CUSTOMER);
    expect(numbers(await listMyOrders({ q: "   " }))).toEqual([1002, 1001]);
    expect(numbers(await listMyOrders({ q: "" }))).toEqual([1002, 1001]);
  });

  it("treats % and _ as plain text", async () => {
    await searchSet();
    switchTo(CUSTOMER);
    for (const q of ["%", "_", "ORD_1001", "ORD%", "\\"]) expect(numbers(await listMyOrders({ q }))).toEqual([]);

    switchTo(ADMIRAL);
    for (const q of ["%", "_", "M_ra", "%Chen"]) expect(numbers(await listAllOrders({ q }))).toEqual([]);

    await db.update(user).set({ name: "100%_real \\ Mira" }).where(eq(user.email, CUSTOMER));
    try {
      expect(numbers(await listAllOrders({ q: "100%" }))).toEqual([1002, 1001]);
      expect(numbers(await listAllOrders({ q: "%_real" }))).toEqual([1002, 1001]);
      expect(numbers(await listAllOrders({ q: "\\ mira" }))).toEqual([1002, 1001]);
      expect(numbers(await listAllOrders({ q: "100_" }))).toEqual([]);
    } finally {
      await db.update(user).set({ name: "Mira Chen" }).where(eq(user.email, CUSTOMER));
    }
  });

  it("stays safe with quotes and SQL in the search text", async () => {
    await searchSet();
    const attacks = ["' OR '1'='1", "'; drop table orders; --", '"; select 1; --', "\\'", "ORD-1001' --"];

    switchTo(CUSTOMER);
    for (const q of attacks) expect(numbers(await listMyOrders({ q }))).toEqual([]);
    switchTo(MARS_MANAGER);
    for (const q of attacks) expect(numbers(await listPlanetOrders({ q }))).toEqual([]);
    switchTo(ADMIRAL);
    for (const q of attacks) expect(numbers(await listAllOrders({ q }))).toEqual([]);
    expect((await listAllOrders()).total).toBe(4);
  });

  it("cuts very long search text at 100 characters", async () => {
    await searchSet();
    switchTo(ADMIRAL);
    expect(numbers(await listAllOrders({ q: "x".repeat(5000) }))).toEqual([]);
    // Only the first 100 characters count: the spaces are trimmed off and the rest is cut.
    expect(numbers(await listAllOrders({ q: `${"Jonas".padEnd(100)}zzz` }))).toEqual([1004, 1003]);
  });

  it("searches across pages and starts the count from the matches", async () => {
    await placeMany(21);
    await placeItems({ Water: 1 }, await MARS_D7(), OTHER_CUSTOMER);

    switchTo(MARS_MANAGER);
    expect(await listPlanetOrders({ q: "Mira", page: 2 })).toMatchObject({ total: 21, page: 2, pageCount: 2 });
    expect(await listPlanetOrders({ q: "Jonas", page: 2 })).toMatchObject({ total: 1, page: 1, pageCount: 1 });
    // ORD-1001, ORD-1010 to ORD-1019.
    expect((await listPlanetOrders({ q: "ORD-101" })).total).toBe(10);
  });

  it("gives a customer no customer name or waiting field, also when searching", async () => {
    await searchSet();
    switchTo(CUSTOMER);
    const keys = deepKeys((await listMyOrders({ q: "ORD", status: "PLACED" })).rows);
    expect(keys.filter((key) => /customer|waiting|cost|profit/i.test(key))).toEqual([]);
  });

  it("gives a manager no making cost or profit, also when searching", async () => {
    await searchSet();
    switchTo(MARS_MANAGER);
    const keys = deepKeys((await listPlanetOrders({ q: "Mira" })).rows);
    expect(keys.filter((key) => /cost|profit/i.test(key))).toEqual([]);
  });

  it("keeps the role checks with every parameter", async () => {
    switchTo(MARS_MANAGER);
    await expect(listMyOrders({ q: "ORD", page: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listAllOrders({ q: "ORD", page: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    switchTo(CUSTOMER);
    await expect(listPlanetOrders({ q: "ORD", page: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    switchTo(CAPTAIN);
    await expect(listMyOrders({ q: "ORD" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    actAsNobody();
    await expect(listMyOrders({ q: "ORD" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(listPlanetOrders({ status: "PLACED" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(listAllOrders({ page: 2 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
