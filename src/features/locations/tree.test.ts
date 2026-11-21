import { describe, expect, it } from "vitest";
import { findDivision } from "./tree";

const tree = [
  {
    id: "mars",
    name: "Mars",
    daysFromEarth: 4,
    deliveryChargeCents: 500,
    sectors: [
      { id: "olympus", name: "Olympus Sector", divisions: [{ id: "d7", name: "Division 7" }] },
      { id: "tharsis", name: "Tharsis Sector", divisions: [{ id: "t1", name: "Division 1" }] },
    ],
  },
  { id: "venus", name: "Venus", daysFromEarth: 2, deliveryChargeCents: 300, sectors: [] },
];

describe("findDivision", () => {
  it("returns the division with its sector and planet", () => {
    const path = findDivision(tree, "t1");
    expect(path?.planet.name).toBe("Mars");
    expect(path?.sector.name).toBe("Tharsis Sector");
    expect(path?.division.name).toBe("Division 1");
  });

  it("returns null for an unknown ID and for no ID", () => {
    expect(findDivision(tree, "nope")).toBeNull();
    expect(findDivision(tree, null)).toBeNull();
    expect(findDivision([], "d7")).toBeNull();
  });
});
