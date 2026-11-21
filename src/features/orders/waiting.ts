import { formatDuration } from "@/lib/dates";
import type { OrderStatus } from "./status";

// C6: an order waits too long after 3 days.
export const OVERDUE_DAYS = 3;

const OVERDUE_MS = OVERDUE_DAYS * 86_400_000;

export type WaitingInput = { status: OrderStatus; createdAt: Date; acceptedAt: Date | null };

// PLACED waits for the manager, ACCEPTED for a captain. Nothing else waits.
export function waitingSince(order: WaitingInput): Date | null {
  if (order.status === "PLACED") return order.createdAt;
  if (order.status === "ACCEPTED") return order.acceptedAt;
  return null;
}

// Strictly more than 3 days: exactly 3 days is not overdue yet.
export function isOverdue(since: Date | null, now: Date): boolean {
  return since !== null && now.getTime() - since.getTime() > OVERDUE_MS;
}

export function waitingLabel(since: Date, now: Date): string {
  if (now.getTime() - since.getTime() < 60_000) return "Just now";
  return `Waiting ${formatDuration(since, now)}`;
}

export type Waiting = { label: string; overdue: boolean };

// What a list shows for one order, or null when the order does not wait.
export function waitingOf(since: Date | null, now: Date): Waiting | null {
  if (!since) return null;
  return { label: waitingLabel(since, now), overdue: isOverdue(since, now) };
}

export type OrderSort = "newest" | "waiting";

// A sort from the URL. Anything unknown is the default.
export function parseOrderSort(value: unknown): OrderSort {
  return value === "waiting" ? "waiting" : "newest";
}
