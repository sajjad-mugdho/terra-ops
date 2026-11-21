import { MAX_UNITS } from "./pricing";

export type Cart = { divisionId: string | null; units: Record<string, number> };

type Param = string | string[] | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

// The cart lives in the URL, so a refresh on the checkout step keeps it.
export function parseCart(params: { division?: Param; items?: Param }): Cart {
  const division = first(params.division);
  const units: Record<string, number> = {};
  for (const part of (first(params.items) ?? "").split(",")) {
    const [productId, count] = part.split(":");
    if (!UUID.test(productId) || !/^\d{1,2}$/.test(count ?? "")) continue;
    const value = Number(count);
    if (value >= 1 && value <= MAX_UNITS) units[productId] = value;
  }
  return { divisionId: division && UUID.test(division) ? division : null, units };
}

export function cartUnits(cart: Cart): number {
  return Object.values(cart.units).reduce((sum, count) => sum + count, 0);
}

export function isCartReady(cart: Cart): boolean {
  const total = cartUnits(cart);
  return cart.divisionId !== null && total >= 1 && total <= MAX_UNITS;
}

export function cartQuery(cart: Cart, step?: "review"): string {
  const query = new URLSearchParams();
  if (step) query.set("step", step);
  if (cart.divisionId) query.set("division", cart.divisionId);
  const items = Object.entries(cart.units)
    .filter(([, count]) => count > 0)
    .map(([productId, count]) => `${productId}:${count}`);
  if (items.length > 0) query.set("items", items.join(","));
  return query.toString();
}
