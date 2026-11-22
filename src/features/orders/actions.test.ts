import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { seedReference } from "@/seed/reference";
import {
  ALL_ACTORS,
  CAPTAIN,
  clearOrders,
  CUSTOMER,
  MARS_D7,
  MARS_MANAGER,
  placeWater,
  productId,
} from "@/test/orders";
import { redirectTarget } from "@/test/redirect";
import { actAsNobody, signInAll, switchTo } from "@/test/session";
import { acceptOrderAction, placeOrderAction, rejectOrderAction } from "./actions";

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));
vi.mock("next/cache", () => cache);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function checkout(units: unknown, over: Record<string, string> = {}) {
  return form({
    divisionId: await MARS_D7(),
    items: JSON.stringify([{ productId: await productId("Water"), units }]),
    expectedTotalCents: String(Number(units) * 1500),
    idempotencyKey: randomUUID(),
    ...over,
  });
}

beforeAll(async () => {
  await seedReference();
  await signInAll(ALL_ACTORS);
});

beforeEach(async () => {
  await clearOrders();
  vi.clearAllMocks();
});

describe("placeOrderAction", () => {
  it("places the order and redirects to its tracking page", async () => {
    switchTo(CUSTOMER);
    const data = await checkout(3);
    const target = await redirectTarget(() => placeOrderAction(null, data));

    const [order] = await db.select().from(orders);
    expect(target).toBe(`/customer/orders/${order.id}`);
    expect(order).toMatchObject({ status: "PLACED", paymentStatus: "PAID", totalUnits: 3 });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/customer");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/customer/orders");
  });

  it("lands on the same order when the form is sent twice", async () => {
    switchTo(CUSTOMER);
    const data = await checkout(3);
    const first = await redirectTarget(() => placeOrderAction(null, data));
    const second = await redirectTarget(() => placeOrderAction(null, data));
    expect(second).toBe(first);
    expect(await db.$count(orders)).toBe(1);
  });

  it.each([-1, 1.5, "three", 21])("returns a field error for units = %s", async (units) => {
    switchTo(CUSTOMER);
    const result = await placeOrderAction(null, await checkout(units, { expectedTotalCents: "0" }));
    expect(result).toMatchObject({ ok: false, error: "Please check your input" });
    expect(await db.$count(orders)).toBe(0);
  });

  it("says what is wrong with an empty order", async () => {
    switchTo(CUSTOMER);
    const zero = await placeOrderAction(null, await checkout(0));
    expect(zero).toEqual({ ok: false, error: "Add at least one product" });

    const none = await placeOrderAction(null, await checkout(1, { items: "[]" }));
    expect(none).toMatchObject({ ok: false, fieldErrors: { items: ["Add at least one product"] } });
  });

  it("returns an error instead of crashing on a broken items field", async () => {
    switchTo(CUSTOMER);
    const result = await placeOrderAction(null, await checkout(1, { items: "{not json" }));
    expect(result).toMatchObject({ ok: false, error: "Please check your input" });
  });

  it("blocks the order and reloads the summary when the price changed", async () => {
    switchTo(CUSTOMER);
    const data = await checkout(3);
    await db.update(products).set({ priceCents: 1100 }).where(eq(products.name, "Water"));
    try {
      const result = await placeOrderAction(null, data);
      expect(result).toEqual({ ok: false, error: "Prices changed. Please review the new total." });
      expect(cache.refresh).toHaveBeenCalledOnce();
      expect(await db.$count(orders)).toBe(0);
    } finally {
      await db.update(products).set({ priceCents: 1000 }).where(eq(products.name, "Water"));
    }
  });

  it("asks to log in again without a session, and refuses other roles", async () => {
    const data = await checkout(1);
    actAsNobody();
    expect(await placeOrderAction(null, data)).toEqual({ ok: false, error: "Please log in again" });
    switchTo(CAPTAIN);
    expect(await placeOrderAction(null, data)).toEqual({ ok: false, error: "Not allowed" });
    expect(await db.$count(orders)).toBe(0);
  });
});

describe("acceptOrderAction and rejectOrderAction", () => {
  it("accepts an order and refreshes the manager pages", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    const result = await acceptOrderAction(null, form({ orderId: placed.id }));

    expect(result).toEqual({ ok: true, data: { message: "Order accepted" } });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/manager");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/manager/queue");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/manager/orders");
  });

  it("reports a stale click and still refreshes the queue", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    await acceptOrderAction(null, form({ orderId: placed.id }));
    vi.clearAllMocks();

    const result = await acceptOrderAction(null, form({ orderId: placed.id }));
    expect(result).toEqual({ ok: false, error: "This order was already handled" });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/manager/queue");
  });

  it("rejects an order with a reason", async () => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    const result = await rejectOrderAction(null, form({ orderId: placed.id, reason: "Out of stock" }));

    expect(result).toEqual({ ok: true, data: { message: "Order rejected" } });
    const [order] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(order).toMatchObject({ status: "REJECTED", paymentStatus: "REFUNDED" });
  });

  it.each(["", "no", "x".repeat(301)])("gives a field error for the reason %j and keeps the text", async (reason) => {
    const placed = await placeWater(3);
    switchTo(MARS_MANAGER);
    const result = await rejectOrderAction(null, form({ orderId: placed.id, reason }));

    expect(result).toMatchObject({ ok: false, reason });
    expect(result && !result.ok && result.fieldErrors?.reason).toHaveLength(1);
    const [order] = await db.select().from(orders).where(eq(orders.id, placed.id));
    expect(order.status).toBe("PLACED");
  });

  it("refuses a customer", async () => {
    const placed = await placeWater(3);
    const result = await acceptOrderAction(null, form({ orderId: placed.id }));
    expect(result).toEqual({ ok: false, error: "Not allowed" });
  });
});
