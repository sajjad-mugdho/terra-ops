export function tripEarningsCents(orders: { deliveryChargesCents: number }[]): number {
  return orders.reduce((sum, order) => sum + order.deliveryChargesCents, 0);
}

// Earnings minus the fuel cost frozen on the trip. Negative is a loss.
export function expectedProfitCents(
  orders: { deliveryChargesCents: number }[],
  fuelCostCents: number,
): number {
  return tripEarningsCents(orders) - fuelCostCents;
}

export type BreakEvenInput = {
  earningsCents: number;
  fuelCostCents: number;
  unitChargeCents: number;
  freeUnits: number;
};

// Units still needed before earnings pay for the fuel. 0: covered. null: the space left cannot cover it.
export function unitsToBreakEven(input: BreakEvenInput): number | null {
  const shortCents = input.fuelCostCents - input.earningsCents;
  if (shortCents <= 0) return 0;
  if (input.unitChargeCents <= 0) return null;
  const units = Math.ceil(shortCents / input.unitChargeCents);
  return units <= input.freeUnits ? units : null;
}

export const CANNOT_COVER_FUEL = "A full ship cannot cover the fuel cost for this planet";

export function breakEvenText(units: number | null): string | null {
  if (units === null) return CANNOT_COVER_FUEL;
  if (units === 0) return null;
  return `${units} more ${units === 1 ? "unit" : "units"} to cover fuel`;
}
