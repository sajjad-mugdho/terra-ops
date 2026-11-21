import { describe, expect, it } from "vitest";
import { lineTotalCents, mergeLines, orderTotals } from "./pricing";

const line = (units: number, unitPriceCents: number, unitDeliveryChargeCents: number) => ({
  units,
  unitPriceCents,
  unitDeliveryChargeCents,
});

describe("orderTotals", () => {
  it("prices the worked example: 3 Water to Mars is $45", () => {
    expect(orderTotals([line(3, 1000, 500)])).toEqual({
      totalUnits: 3,
      productAmountCents: 3000,
      deliveryChargesCents: 1500,
      totalCents: 4500,
    });
  });

  it("adds many lines", () => {
    expect(orderTotals([line(3, 1000, 500), line(1, 1200, 500), line(2, 6000, 500)])).toEqual({
      totalUnits: 6,
      productAmountCents: 3000 + 1200 + 12000,
      deliveryChargesCents: 3000,
      totalCents: 19200,
    });
  });

  it("prices a full order of 20 units", () => {
    expect(orderTotals([line(20, 6000, 2000)])).toEqual({
      totalUnits: 20,
      productAmountCents: 120_000,
      deliveryChargesCents: 40_000,
      totalCents: 160_000,
    });
  });

  it("still charges delivery for a product priced at $0", () => {
    expect(orderTotals([line(4, 0, 500)])).toEqual({
      totalUnits: 4,
      productAmountCents: 0,
      deliveryChargesCents: 2000,
      totalCents: 2000,
    });
  });

  it("gives zeros for no lines", () => {
    expect(orderTotals([])).toEqual({
      totalUnits: 0,
      productAmountCents: 0,
      deliveryChargesCents: 0,
      totalCents: 0,
    });
  });

  it("matches (price + delivery charge) × units on every line", () => {
    const lines = [line(3, 1000, 500), line(7, 1433, 911)];
    const sum = lines.reduce((total, each) => total + lineTotalCents(each), 0);
    expect(lineTotalCents(lines[1])).toBe(7 * (1433 + 911));
    expect(orderTotals(lines).totalCents).toBe(sum);
  });
});

describe("mergeLines", () => {
  it("merges the same product sent twice", () => {
    expect(
      mergeLines([
        { productId: "a", units: 2 },
        { productId: "b", units: 1 },
        { productId: "a", units: 3 },
      ]),
    ).toEqual([
      { productId: "a", units: 5 },
      { productId: "b", units: 1 },
    ]);
  });

  it("drops lines with 0 units", () => {
    expect(
      mergeLines([
        { productId: "a", units: 0 },
        { productId: "b", units: 4 },
      ]),
    ).toEqual([{ productId: "b", units: 4 }]);
  });

  it.each([[[]], [[{ productId: "a", units: 0 }]]])("refuses an empty order", (items) => {
    expect(() => mergeLines(items)).toThrow("Add at least one product");
  });

  it("accepts exactly 20 units and refuses 21", () => {
    expect(mergeLines([{ productId: "a", units: 20 }])).toHaveLength(1);
    expect(() => mergeLines([{ productId: "a", units: 21 }])).toThrow(
      "An order can have at most 20 units",
    );
  });

  it("counts merged lines against the limit", () => {
    const items = [
      { productId: "a", units: 11 },
      { productId: "a", units: 10 },
    ];
    expect(() => mergeLines(items)).toThrow("An order can have at most 20 units");
  });

  it.each([-1, 1.5, Number.NaN])("refuses %s units", (units) => {
    expect(() => mergeLines([{ productId: "a", units }])).toThrow("Units must be a whole number");
  });

  it("throws INVALID", () => {
    expect(() => mergeLines([])).toThrow(expect.objectContaining({ code: "INVALID" }));
  });
});
