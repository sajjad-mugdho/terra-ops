import { describe, expect, it } from "vitest";
import {
  canTripTransition,
  hasReached,
  isOpenTrip,
  parseTripStatus,
  TRIP_STATUSES,
  tripCode,
  tripLabel,
  type TripStatus,
  tripTone,
} from "./status";

const VALID: [TripStatus, TripStatus][] = [
  ["PLANNING", "LOADED"],
  ["PLANNING", "CANCELLED"],
  ["LOADED", "LIFTED_OFF"],
  ["LIFTED_OFF", "LANDED"],
  ["LANDED", "COMPLETED"],
];

const isValid = (from: TripStatus, to: TripStatus) => VALID.some(([a, b]) => a === from && b === to);

const ALL_PAIRS = TRIP_STATUSES.flatMap((from) => TRIP_STATUSES.map((to) => [from, to] as const));

describe("canTripTransition", () => {
  it.each(VALID)("allows %s → %s", (from, to) => {
    expect(canTripTransition(from, to)).toBe(true);
  });

  it.each(ALL_PAIRS.filter(([from, to]) => !isValid(from, to)))("refuses %s → %s", (from, to) => {
    expect(canTripTransition(from, to)).toBe(false);
  });

  it("checks all 36 pairs, 5 of them valid", () => {
    expect(ALL_PAIRS).toHaveLength(36);
    expect(ALL_PAIRS.filter(([from, to]) => canTripTransition(from, to))).toHaveLength(5);
  });

  it("cancels only from PLANNING", () => {
    const from = TRIP_STATUSES.filter((status) => canTripTransition(status, "CANCELLED"));
    expect(from).toEqual(["PLANNING"]);
  });
});

describe("hasReached", () => {
  it("is true for the same step and every later one", () => {
    expect(hasReached("LOADED", "LOADED")).toBe(true);
    expect(hasReached("LANDED", "LOADED")).toBe(true);
    expect(hasReached("COMPLETED", "LANDED")).toBe(true);
  });

  it("is false for a step still ahead", () => {
    expect(hasReached("PLANNING", "LOADED")).toBe(false);
    expect(hasReached("LOADED", "LANDED")).toBe(false);
  });

  it("keeps CANCELLED apart from the flight", () => {
    expect(hasReached("CANCELLED", "LOADED")).toBe(false);
    expect(hasReached("LANDED", "CANCELLED")).toBe(false);
    expect(hasReached("CANCELLED", "CANCELLED")).toBe(true);
  });
});

describe("helpers", () => {
  it("counts COMPLETED and CANCELLED as closed", () => {
    expect(TRIP_STATUSES.filter(isOpenTrip)).toEqual(["PLANNING", "LOADED", "LIFTED_OFF", "LANDED"]);
  });

  it("labels and codes a trip", () => {
    expect(tripLabel("LIFTED_OFF")).toBe("Lifted off");
    expect(tripCode(101)).toBe("TRP-101");
  });
});

describe("tripTone", () => {
  it.each([
    ["PLANNING", "neutral"],
    ["LOADED", "info"],
    ["LIFTED_OFF", "info"],
    ["LANDED", "info"],
    ["COMPLETED", "success"],
    ["CANCELLED", "danger"],
  ] as const)("%s is %s", (status, tone) => {
    expect(tripTone(status)).toBe(tone);
  });
});

describe("parseTripStatus", () => {
  it.each(TRIP_STATUSES)("accepts %s", (status) => {
    expect(parseTripStatus(status)).toBe(status);
  });

  it.each(["completed", "DELIVERED", "", undefined, ["COMPLETED"], 1])("ignores %j", (value) => {
    expect(parseTripStatus(value)).toBeUndefined();
  });
});
