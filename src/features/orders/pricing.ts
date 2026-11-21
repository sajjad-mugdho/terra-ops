import { AppError } from "@/lib/errors";

export const MAX_UNITS = 20;

export type PricedLine = {
  units: number;
  unitPriceCents: number;
  unitDeliveryChargeCents: number;
};

export type OrderTotals = {
  totalUnits: number;
  productAmountCents: number;
  deliveryChargesCents: number;
  totalCents: number;
};

export function lineTotalCents(line: PricedLine): number {
  return line.units * (line.unitPriceCents + line.unitDeliveryChargeCents);
}

export function orderTotals(lines: PricedLine[]): OrderTotals {
  let totalUnits = 0;
  let productAmountCents = 0;
  let deliveryChargesCents = 0;
  for (const line of lines) {
    totalUnits += line.units;
    productAmountCents += line.units * line.unitPriceCents;
    deliveryChargesCents += line.units * line.unitDeliveryChargeCents;
  }
  return {
    totalUnits,
    productAmountCents,
    deliveryChargesCents,
    totalCents: productAmountCents + deliveryChargesCents,
  };
}

export type RequestedLine = { productId: string; units: number };

// One line per product, zero lines dropped, and the 1 to 20 unit rule.
export function mergeLines(items: RequestedLine[]): RequestedLine[] {
  const units = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.units) || item.units < 0) {
      throw new AppError("INVALID", "Units must be a whole number");
    }
    if (item.units > 0) units.set(item.productId, (units.get(item.productId) ?? 0) + item.units);
  }

  const lines = [...units].map(([productId, count]) => ({ productId, units: count }));
  const total = lines.reduce((sum, line) => sum + line.units, 0);
  if (total < 1) throw new AppError("INVALID", "Add at least one product");
  if (total > MAX_UNITS) throw new AppError("INVALID", "An order can have at most 20 units");
  return lines;
}
