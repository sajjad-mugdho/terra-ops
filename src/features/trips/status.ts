export const TRIP_STATUSES = [
  "PLANNING",
  "LOADED",
  "LIFTED_OFF",
  "LANDED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_CAPACITY = 20;

const NEXT: Record<TripStatus, readonly TripStatus[]> = {
  PLANNING: ["LOADED", "CANCELLED"],
  LOADED: ["LIFTED_OFF"],
  LIFTED_OFF: ["LANDED"],
  LANDED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTripTransition(from: TripStatus, to: TripStatus): boolean {
  return NEXT[from].includes(to);
}

const FLIGHT: readonly TripStatus[] = ["PLANNING", "LOADED", "LIFTED_OFF", "LANDED", "COMPLETED"];

// True when the trip is already at this step or past it: a repeated click.
export function hasReached(current: TripStatus, step: TripStatus): boolean {
  if (current === "CANCELLED" || step === "CANCELLED") return current === step;
  return FLIGHT.indexOf(current) >= FLIGHT.indexOf(step);
}

export function isOpenTrip(status: TripStatus): boolean {
  return status !== "COMPLETED" && status !== "CANCELLED";
}

const LABELS: Record<TripStatus, string> = {
  PLANNING: "Planning",
  LOADED: "Loaded",
  LIFTED_OFF: "Lifted off",
  LANDED: "Landed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function tripLabel(status: TripStatus): string {
  return LABELS[status];
}

export function tripCode(number: number): string {
  return `TRP-${number}`;
}
