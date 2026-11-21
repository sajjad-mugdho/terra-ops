import type { OrderStatus } from "@/features/orders/status";

export type StopState = "pending" | "at_sector" | "delivered";

export type StopOrder = {
  divisionId: string;
  sector: string;
  division: string;
  status: OrderStatus;
  totalUnits: number;
};

export type Stop<T extends StopOrder> = {
  divisionId: string;
  sector: string;
  division: string;
  orders: T[];
  units: number;
  state: StopState;
};

function stateOf(orders: StopOrder[]): StopState {
  if (orders.every((order) => order.status === "DELIVERED")) return "delivered";
  // A stop moves as one, so any order still short of the sector keeps it pending.
  if (orders.every((order) => order.status === "AT_SECTOR" || order.status === "DELIVERED")) {
    return "at_sector";
  }
  return "pending";
}

// A stop is every order of the trip that goes to the same division.
export function groupStops<T extends StopOrder>(orders: T[]): Stop<T>[] {
  const byDivision = new Map<string, T[]>();
  for (const order of orders) {
    const group = byDivision.get(order.divisionId);
    if (group) group.push(order);
    else byDivision.set(order.divisionId, [order]);
  }

  return [...byDivision.values()]
    .map((group) => ({
      divisionId: group[0].divisionId,
      sector: group[0].sector,
      division: group[0].division,
      orders: group,
      units: group.reduce((sum, order) => sum + order.totalUnits, 0),
      state: stateOf(group),
    }))
    .sort((a, b) => a.sector.localeCompare(b.sector) || a.division.localeCompare(b.division));
}
