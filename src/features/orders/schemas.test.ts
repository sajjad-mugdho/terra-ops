import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { placeOrderSchema, rejectOrderSchema } from "./schemas";

const valid = () => ({
  divisionId: randomUUID(),
  items: [{ productId: randomUUID(), units: 3 }],
  expectedTotalCents: 4500,
  idempotencyKey: randomUUID(),
});

const withUnits = (units: unknown) => ({ ...valid(), items: [{ productId: randomUUID(), units }] });

describe("placeOrderSchema", () => {
  it("accepts a normal order", () => {
    expect(placeOrderSchema.safeParse(valid()).success).toBe(true);
  });

  it.each([-1, 1.5, "3", "many", null, 21])("refuses units = %s", (units) => {
    expect(placeOrderSchema.safeParse(withUnits(units)).success).toBe(false);
  });

  it("refuses an order without lines", () => {
    const result = placeOrderSchema.safeParse({ ...valid(), items: [] });
    expect(result.error?.issues[0].message).toBe("Add at least one product");
  });

  it.each(["divisionId", "idempotencyKey"] as const)("refuses a %s that is not an ID", (key) => {
    expect(placeOrderSchema.safeParse({ ...valid(), [key]: "abc" }).success).toBe(false);
  });

  it("refuses a product that is not an ID", () => {
    const input = { ...valid(), items: [{ productId: "water", units: 1 }] };
    expect(placeOrderSchema.safeParse(input).success).toBe(false);
  });

  it("drops a planet ID and prices sent by the client", () => {
    const input = {
      ...valid(),
      planetId: randomUUID(),
      items: [{ productId: randomUUID(), units: 1, unitPriceCents: 1 }],
    };
    const parsed = placeOrderSchema.parse(input);
    expect(parsed).not.toHaveProperty("planetId");
    expect(parsed.items[0]).not.toHaveProperty("unitPriceCents");
  });
});

describe("rejectOrderSchema", () => {
  const orderId = randomUUID();

  it.each(["", "  ", "no", " a  "])("refuses the reason %j", (reason) => {
    expect(rejectOrderSchema.safeParse({ orderId, reason }).success).toBe(false);
  });

  it("accepts 3 and 300 characters, refuses 301", () => {
    expect(rejectOrderSchema.safeParse({ orderId, reason: "abc" }).success).toBe(true);
    expect(rejectOrderSchema.safeParse({ orderId, reason: "x".repeat(300) }).success).toBe(true);
    expect(rejectOrderSchema.safeParse({ orderId, reason: "x".repeat(301) }).success).toBe(false);
  });

  it("trims the reason", () => {
    expect(rejectOrderSchema.parse({ orderId, reason: "  Out of stock  " }).reason).toBe(
      "Out of stock",
    );
  });
});
