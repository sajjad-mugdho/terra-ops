import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/features/orders/status";
import { groupStops } from "./stops";

const order = (
  divisionId: string,
  sector: string,
  division: string,
  status: OrderStatus = "LANDED",
  totalUnits = 1,
) => ({ divisionId, sector, division, status, totalUnits });

describe("groupStops", () => {
  it("returns no stops for an empty trip", () => {
    expect(groupStops([])).toEqual([]);
  });

  it("puts orders of one division in one stop and adds their units", () => {
    const stops = groupStops([
      order("d7", "Olympus Sector", "Division 7", "LANDED", 3),
      order("d7", "Olympus Sector", "Division 7", "LANDED", 5),
    ]);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ divisionId: "d7", units: 8, state: "pending" });
    expect(stops[0].orders).toHaveLength(2);
  });

  it("makes two stops for two divisions of the same sector", () => {
    const stops = groupStops([
      order("d8", "Olympus Sector", "Division 8"),
      order("d7", "Olympus Sector", "Division 7"),
    ]);
    expect(stops.map((stop) => stop.division)).toEqual(["Division 7", "Division 8"]);
  });

  it("sorts by sector, then division", () => {
    const stops = groupStops([
      order("t1", "Tharsis Sector", "Division 1"),
      order("d9", "Olympus Sector", "Division 9"),
      order("d7", "Olympus Sector", "Division 7"),
    ]);
    expect(stops.map((stop) => `${stop.sector} ${stop.division}`)).toEqual([
      "Olympus Sector Division 7",
      "Olympus Sector Division 9",
      "Tharsis Sector Division 1",
    ]);
  });

  it.each([
    ["ASSIGNED", "pending"],
    ["LOADED", "pending"],
    ["LIFTED_OFF", "pending"],
    ["LANDED", "pending"],
    ["AT_SECTOR", "at_sector"],
    ["DELIVERED", "delivered"],
  ] as const)("reads %s as %s", (status, state) => {
    expect(groupStops([order("d7", "Olympus Sector", "Division 7", status)])[0].state).toBe(state);
  });

  it("gives each stop its own state", () => {
    const stops = groupStops([
      order("d7", "Olympus Sector", "Division 7", "DELIVERED"),
      order("d8", "Olympus Sector", "Division 8", "AT_SECTOR"),
      order("t1", "Tharsis Sector", "Division 1", "LANDED"),
    ]);
    expect(stops.map((stop) => stop.state)).toEqual(["delivered", "at_sector", "pending"]);
  });

  it("keeps the extra fields of each order", () => {
    const stops = groupStops([{ ...order("d7", "Olympus Sector", "Division 7"), number: 1001 }]);
    expect(stops[0].orders[0].number).toBe(1001);
  });
});
