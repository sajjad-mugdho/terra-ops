import { describe, expect, it } from "vitest";
import { updatePlanetChargesSchema, updateProductSchema } from "./schemas";

const ID = "7f1c2d9e-4b3a-4c5d-8e6f-0a1b2c3d4e5f";

const product = (price: string, makingCost = "7") =>
  updateProductSchema.safeParse({ productId: ID, price, makingCost });

const priceError = (price: string) => {
  const result = product(price);
  return result.success ? null : result.error.issues[0].message;
};

describe("updateProductSchema", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    [" 0 ", 0],
    ["0.01", 1],
    ["1000000", 100_000_000],
    ["1000000.00", 100_000_000],
  ])("turns %j into %i cents", (text, cents) => {
    const result = product(text);
    expect(result.success && result.data.price).toBe(cents);
  });

  it("says an empty field needs an amount", () => {
    expect(priceError("")).toBe("Enter an amount");
    expect(priceError("   ")).toBe("Enter an amount");
  });

  it("refuses a negative amount", () => {
    expect(priceError("-5")).toBe("The amount cannot be negative");
  });

  it.each(["12.345", "abc", "1e3", "12,50", "$12", "1.", ".5", "1 2"])("refuses %j", (text) => {
    expect(priceError(text)).toBe("Enter a number with at most 2 decimals, like 12.50");
  });

  it.each(["1000000.01", "1000001", "99999999999999999999"])("caps %j at $1,000,000", (text) => {
    expect(priceError(text)).not.toBeNull();
  });

  it("reports each bad field under its own name", () => {
    const result = updateProductSchema.safeParse({ productId: ID, price: "", makingCost: "-1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["price", "makingCost"]);
  });

  it("refuses an ID that is not a UUID", () => {
    expect(updateProductSchema.safeParse({ productId: "1", price: "1", makingCost: "1" }).success).toBe(false);
  });
});

describe("updatePlanetChargesSchema", () => {
  it("parses both charges to cents", () => {
    const result = updatePlanetChargesSchema.parse({ planetId: ID, deliveryCharge: "5", fuelCost: "40.5" });
    expect(result).toEqual({ planetId: ID, deliveryCharge: 500, fuelCost: 4050 });
  });

  it("accepts a delivery charge of 0", () => {
    const result = updatePlanetChargesSchema.safeParse({ planetId: ID, deliveryCharge: "0", fuelCost: "0" });
    expect(result.success).toBe(true);
  });

  it.each(["", "-1", "1.234", "x"])("refuses the fuel cost %j", (fuelCost) => {
    const result = updatePlanetChargesSchema.safeParse({ planetId: ID, deliveryCharge: "5", fuelCost });
    expect(result.success).toBe(false);
  });
});
