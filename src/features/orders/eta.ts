import { addDays, formatUtc } from "@/lib/dates";
import type { OrderStatus } from "./status";

export type EtaInput = {
  status: OrderStatus;
  planet: string;
  daysFromEarth: number;
  liftedOffAt: Date | null;
  deliveredAt: Date | null;
};

// An estimate only: captains mark every step by hand.
export function etaText(order: EtaInput): string | null {
  if (order.status === "REJECTED") return null;
  if (order.status === "DELIVERED" && order.deliveredAt) {
    return `Delivered on ${formatUtc(order.deliveredAt)}`;
  }
  if (order.status === "LANDED" || order.status === "AT_SECTOR") return `Landed on ${order.planet}`;
  if (order.status === "LIFTED_OFF" && order.liftedOffAt) {
    return `ETA: ${formatUtc(addDays(order.liftedOffAt, order.daysFromEarth))}`;
  }
  const days = order.daysFromEarth === 1 ? "1 day" : `${order.daysFromEarth} days`;
  return `About ${days} after lift-off`;
}

export function waitingText(status: OrderStatus): string | null {
  if (status === "PLACED") return "Waiting for the planet to accept";
  if (status === "ACCEPTED") return "Waiting for a captain";
  return null;
}
