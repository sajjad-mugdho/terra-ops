import { describe, expect, it } from "vitest";
import { etaText, waitingText } from "./eta";
import type { OrderStatus } from "./status";

const liftedOffAt = new Date("2026-11-21T14:05:00Z");

const order = (status: OrderStatus, over: Partial<Parameters<typeof etaText>[0]> = {}) => ({
  status,
  planet: "Mars",
  daysFromEarth: 4,
  liftedOffAt: null,
  deliveredAt: null,
  ...over,
});

describe("etaText", () => {
  it.each(["PLACED", "ACCEPTED", "ASSIGNED", "LOADED"] as const)(
    "says how long the flight takes while the order is %s",
    (status) => {
      expect(etaText(order(status))).toBe("About 4 days after lift-off");
    },
  );

  it("uses the singular for a 1 day flight", () => {
    expect(etaText(order("ACCEPTED", { daysFromEarth: 1 }))).toBe("About 1 day after lift-off");
  });

  it("adds the planet's days to the lift-off time, in UTC", () => {
    expect(etaText(order("LIFTED_OFF", { liftedOffAt }))).toBe("ETA: 25 Nov 2026, 14:05 UTC");
  });

  it("crosses a month end", () => {
    const text = etaText(order("LIFTED_OFF", { liftedOffAt, daysFromEarth: 40 }));
    expect(text).toBe("ETA: 31 Dec 2026, 14:05 UTC");
  });

  it.each(["LANDED", "AT_SECTOR"] as const)("says where the ship landed while %s", (status) => {
    expect(etaText(order(status, { liftedOffAt }))).toBe("Landed on Mars");
  });

  it("shows the real delivery time once delivered", () => {
    const deliveredAt = new Date("2026-11-24T09:30:00Z");
    expect(etaText(order("DELIVERED", { liftedOffAt, deliveredAt }))).toBe(
      "Delivered on 24 Nov 2026, 09:30 UTC",
    );
  });

  it("has no ETA for a rejected order", () => {
    expect(etaText(order("REJECTED"))).toBeNull();
  });
});

describe("waitingText", () => {
  it("explains who the order waits for before it has a ship", () => {
    expect(waitingText("PLACED")).toBe("Waiting for the planet to accept");
    expect(waitingText("ACCEPTED")).toBe("Waiting for a captain");
  });

  it.each(["REJECTED", "ASSIGNED", "LOADED", "LIFTED_OFF", "LANDED", "AT_SECTOR", "DELIVERED"] as const)(
    "says nothing for %s",
    (status) => {
      expect(waitingText(status)).toBeNull();
    },
  );
});
