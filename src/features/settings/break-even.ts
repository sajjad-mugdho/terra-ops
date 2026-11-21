import { TRIP_CAPACITY } from "@/features/trips/status";

export const MAX_MONEY_CENTS = 100_000_000;

export function marginCents(priceCents: number, makingCostCents: number): number {
  return priceCents - makingCostCents;
}

// How many units a trip must carry before delivery charges pay for the fuel. null: never.
export function unitsToCoverFuel(fuelCostCents: number, deliveryChargeCents: number): number | null {
  if (deliveryChargeCents <= 0) return fuelCostCents <= 0 ? 0 : null;
  return Math.ceil(fuelCostCents / deliveryChargeCents);
}

export function fullShipCoversFuel(units: number | null): boolean {
  return units !== null && units <= TRIP_CAPACITY;
}

export function isMoneyCents(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_MONEY_CENTS;
}
