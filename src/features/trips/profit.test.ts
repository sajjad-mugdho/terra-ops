import { describe, expect, it } from "vitest";
import {
  breakEvenText,
  CANNOT_COVER_FUEL,
  expectedProfitCents,
  tripEarningsCents,
  unitsToBreakEven,
} from "./profit";

const order = (deliveryChargesCents: number) => ({ deliveryChargesCents });

describe("expectedProfitCents", () => {
  it("is minus the fuel cost for an empty trip", () => {
    expect(expectedProfitCents([], 4000)).toBe(-4000);
  });

  it("is negative for a loss trip", () => {
    expect(expectedProfitCents([order(2500)], 4000)).toBe(-1500);
  });

  it("is exactly zero at break-even", () => {
    expect(expectedProfitCents([order(1500), order(2500)], 4000)).toBe(0);
  });

  it("is positive for the worked example: $90 earned, $40 fuel", () => {
    expect(expectedProfitCents([order(6000), order(3000)], 4000)).toBe(5000);
  });

  it("uses each order's own frozen charge when charges differ", () => {
    // 3 units at $5 and 2 units at $7, after the planet's charge changed.
    const orders = [order(3 * 500), order(2 * 700)];
    expect(tripEarningsCents(orders)).toBe(2900);
    expect(expectedProfitCents(orders, 4000)).toBe(-1100);
  });

  it("handles orders with a zero delivery charge", () => {
    expect(expectedProfitCents([order(0), order(0)], 4000)).toBe(-4000);
    expect(expectedProfitCents([order(0)], 0)).toBe(0);
  });
});

describe("unitsToBreakEven", () => {
  const mars = { fuelCostCents: 4000, unitChargeCents: 500 };

  it("needs the whole fuel cost on an empty trip", () => {
    expect(unitsToBreakEven({ ...mars, earningsCents: 0, freeUnits: 20 })).toBe(8);
  });

  it("counts only what is still missing", () => {
    expect(unitsToBreakEven({ ...mars, earningsCents: 2500, freeUnits: 15 })).toBe(3);
  });

  it("rounds up to a whole unit", () => {
    expect(unitsToBreakEven({ ...mars, earningsCents: 2600, freeUnits: 15 })).toBe(3);
    expect(unitsToBreakEven({ ...mars, earningsCents: 3999, freeUnits: 15 })).toBe(1);
  });

  it("is 0 at break-even and above it", () => {
    expect(unitsToBreakEven({ ...mars, earningsCents: 4000, freeUnits: 12 })).toBe(0);
    expect(unitsToBreakEven({ ...mars, earningsCents: 9000, freeUnits: 2 })).toBe(0);
    expect(unitsToBreakEven({ ...mars, earningsCents: 9000, freeUnits: 0 })).toBe(0);
  });

  it("is reachable when the needed units are exactly the space left", () => {
    expect(unitsToBreakEven({ fuelCostCents: 10000, unitChargeCents: 500, earningsCents: 0, freeUnits: 20 })).toBe(20);
  });

  it("is null when a full ship cannot cover the fuel", () => {
    expect(unitsToBreakEven({ fuelCostCents: 10001, unitChargeCents: 500, earningsCents: 0, freeUnits: 20 })).toBeNull();
  });

  it("is null when the space left is too small", () => {
    expect(unitsToBreakEven({ ...mars, earningsCents: 2500, freeUnits: 2 })).toBeNull();
    expect(unitsToBreakEven({ ...mars, earningsCents: 3500, freeUnits: 0 })).toBeNull();
  });

  it("is null for a zero delivery charge, without dividing by zero", () => {
    expect(unitsToBreakEven({ fuelCostCents: 4000, unitChargeCents: 0, earningsCents: 0, freeUnits: 20 })).toBeNull();
  });

  it("is 0 when there is no fuel cost, even with a zero charge", () => {
    expect(unitsToBreakEven({ fuelCostCents: 0, unitChargeCents: 0, earningsCents: 0, freeUnits: 20 })).toBe(0);
  });
});

describe("breakEvenText", () => {
  it("says how many units are missing", () => {
    expect(breakEvenText(8)).toBe("8 more units to cover fuel");
    expect(breakEvenText(1)).toBe("1 more unit to cover fuel");
  });

  it("says nothing once the fuel is covered", () => {
    expect(breakEvenText(0)).toBeNull();
  });

  it("names the planet problem when the fuel cannot be covered", () => {
    expect(breakEvenText(null)).toBe(CANNOT_COVER_FUEL);
  });
});
