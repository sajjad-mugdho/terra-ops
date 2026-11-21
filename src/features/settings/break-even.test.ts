import { describe, expect, it } from "vitest";
import {
  fullShipCoversFuel,
  isMoneyCents,
  marginCents,
  MAX_MONEY_CENTS,
  unitsToCoverFuel,
} from "./break-even";

describe("marginCents", () => {
  it.each([
    [1000, 600, 400],
    [600, 600, 0],
    [500, 600, -100],
    [0, 0, 0],
  ])("price %i, cost %i gives %i", (price, cost, margin) => {
    expect(marginCents(price, cost)).toBe(margin);
  });
});

describe("unitsToCoverFuel", () => {
  it.each([
    [4000, 500, 8],
    [4000, 300, 14],
    [2500, 300, 9],
    [32000, 2000, 16],
    [1, 500, 1],
    [501, 500, 2],
    [0, 500, 0],
  ])("fuel %i at %i a unit needs %i units", (fuel, charge, units) => {
    expect(unitsToCoverFuel(fuel, charge)).toBe(units);
  });

  it("never covers the fuel with a delivery charge of 0", () => {
    expect(unitsToCoverFuel(4000, 0)).toBeNull();
  });

  it("needs nothing when both are 0", () => {
    expect(unitsToCoverFuel(0, 0)).toBe(0);
  });
});

describe("fullShipCoversFuel", () => {
  it.each([
    [0, true],
    [20, true],
    [21, false],
    [null, false],
  ])("%s units: %s", (units, covers) => {
    expect(fullShipCoversFuel(units)).toBe(covers);
  });
});

describe("isMoneyCents", () => {
  it.each([0, 1, 1250, MAX_MONEY_CENTS])("accepts %i", (value) => {
    expect(isMoneyCents(value)).toBe(true);
  });

  it.each([-1, 12.5, MAX_MONEY_CENTS + 1, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses %s",
    (value) => {
      expect(isMoneyCents(value)).toBe(false);
    },
  );
});
