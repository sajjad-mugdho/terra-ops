export const ORDER_STATUSES = [
  "PLACED",
  "ACCEPTED",
  "REJECTED",
  "ASSIGNED",
  "LOADED",
  "LIFTED_OFF",
  "LANDED",
  "AT_SECTOR",
  "DELIVERED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentStatus = "PAID" | "REFUNDED";

// A status from the URL. Anything unknown is ignored.
export function parseOrderStatus(value: unknown): OrderStatus | undefined {
  return ORDER_STATUSES.find((status) => status === value);
}

// The 8 steps of the progress line. REJECTED is a dead end, not a step.
export const ORDER_STEPS: readonly OrderStatus[] = ORDER_STATUSES.filter(
  (status) => status !== "REJECTED",
);

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["ASSIGNED"],
  REJECTED: [],
  // Back to ACCEPTED only while the trip is still PLANNING.
  ASSIGNED: ["LOADED", "ACCEPTED"],
  LOADED: ["LIFTED_OFF"],
  LIFTED_OFF: ["LANDED"],
  LANDED: ["AT_SECTOR"],
  AT_SECTOR: ["DELIVERED"],
  DELIVERED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT[from].includes(to);
}

// DELIVERED and REJECTED: nothing can happen to the order any more.
export function isFinalStatus(status: OrderStatus): boolean {
  return NEXT[status].length === 0;
}

const LABELS: Record<OrderStatus, string> = {
  PLACED: "Order placed",
  ACCEPTED: "Accepted by planet",
  REJECTED: "Rejected",
  ASSIGNED: "Assigned to a ship",
  LOADED: "Loaded on ship",
  LIFTED_OFF: "Lifted off from Earth",
  LANDED: "Landed on planet",
  AT_SECTOR: "Delivered to sector",
  DELIVERED: "Delivered to division",
};

export function customerLabel(status: OrderStatus): string {
  return LABELS[status];
}

export type EventPlace = { planet: string; sector: string; division: string };

// leftTrip: an ACCEPTED event that carries a trip is the order coming back from that trip.
export function eventLabel(status: OrderStatus, place: EventPlace, leftTrip = false): string {
  if (status === "ACCEPTED" && leftTrip) return "Removed from trip";
  if (status === "LANDED") return `Landed on ${place.planet}`;
  if (status === "AT_SECTOR") return `Delivered to ${place.sector}`;
  if (status === "DELIVERED") return `Delivered to ${place.division}`;
  return LABELS[status];
}

export type Tone = "neutral" | "info" | "success" | "danger";

export function orderTone(status: OrderStatus): Tone {
  if (status === "REJECTED") return "danger";
  if (status === "DELIVERED") return "success";
  return status === "PLACED" ? "neutral" : "info";
}

export const ORDER_CODE_PREFIX = "ORD-";

export function orderCode(number: number): string {
  return `${ORDER_CODE_PREFIX}${number}`;
}
