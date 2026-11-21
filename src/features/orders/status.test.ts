import { describe, expect, it } from "vitest";
import {
  canTransition,
  customerLabel,
  eventLabel,
  ORDER_STATUSES,
  ORDER_STEPS,
  orderCode,
  orderTone,
  type OrderStatus,
  parseOrderStatus,
} from "./status";

const VALID: [OrderStatus, OrderStatus][] = [
  ["PLACED", "ACCEPTED"],
  ["PLACED", "REJECTED"],
  ["ACCEPTED", "ASSIGNED"],
  ["ASSIGNED", "LOADED"],
  ["ASSIGNED", "ACCEPTED"],
  ["LOADED", "LIFTED_OFF"],
  ["LIFTED_OFF", "LANDED"],
  ["LANDED", "AT_SECTOR"],
  ["AT_SECTOR", "DELIVERED"],
];

const isValid = (from: OrderStatus, to: OrderStatus) =>
  VALID.some(([a, b]) => a === from && b === to);

const ALL_PAIRS = ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.map((to) => [from, to] as const));

describe("canTransition", () => {
  it.each(VALID)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each(ALL_PAIRS.filter(([from, to]) => !isValid(from, to)))("refuses %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("checks all 81 pairs, 9 of them valid", () => {
    expect(ALL_PAIRS).toHaveLength(81);
    expect(ALL_PAIRS.filter(([from, to]) => canTransition(from, to))).toHaveLength(9);
  });

  it("has no way out of REJECTED or DELIVERED", () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition("REJECTED", to)).toBe(false);
      expect(canTransition("DELIVERED", to)).toBe(false);
    }
  });
});

describe("labels", () => {
  it("gives every status the text from the plan", () => {
    expect(ORDER_STATUSES.map(customerLabel)).toEqual([
      "Order placed",
      "Accepted by planet",
      "Rejected",
      "Assigned to a ship",
      "Loaded on ship",
      "Lifted off from Earth",
      "Landed on planet",
      "Delivered to sector",
      "Delivered to division",
    ]);
  });

  it("has 8 progress steps, without REJECTED", () => {
    expect(ORDER_STEPS).toHaveLength(8);
    expect(ORDER_STEPS).not.toContain("REJECTED");
    expect(ORDER_STEPS[0]).toBe("PLACED");
    expect(ORDER_STEPS.at(-1)).toBe("DELIVERED");
  });

  it("names the real places in the timeline", () => {
    const place = { planet: "Mars", sector: "Olympus Sector", division: "Division 7" };
    expect(eventLabel("PLACED", place)).toBe("Order placed");
    expect(eventLabel("LANDED", place)).toBe("Landed on Mars");
    expect(eventLabel("AT_SECTOR", place)).toBe("Delivered to Olympus Sector");
    expect(eventLabel("DELIVERED", place)).toBe("Delivered to Division 7");
  });

  it("tells a first accept from an order that left a trip", () => {
    const place = { planet: "Mars", sector: "Olympus Sector", division: "Division 7" };
    expect(eventLabel("ACCEPTED", place)).toBe("Accepted by planet");
    expect(eventLabel("ACCEPTED", place, true)).toBe("Removed from trip");
    expect(eventLabel("ASSIGNED", place, true)).toBe("Assigned to a ship");
  });

  it("colors the end states", () => {
    expect(orderTone("REJECTED")).toBe("danger");
    expect(orderTone("DELIVERED")).toBe("success");
    expect(orderTone("PLACED")).toBe("neutral");
    expect(orderTone("LOADED")).toBe("info");
  });

  it("formats the order code", () => {
    expect(orderCode(1001)).toBe("ORD-1001");
  });
});

describe("parseOrderStatus", () => {
  it.each(ORDER_STATUSES)("accepts %s", (status) => {
    expect(parseOrderStatus(status)).toBe(status);
  });

  it.each(["placed", "COMPLETED", "", undefined, ["PLACED"], 1])("ignores %j", (value) => {
    expect(parseOrderStatus(value)).toBeUndefined();
  });
});
