import { describe, expect, it } from "vitest";
import { byProfitThenName } from "./ranking";

const names = (rows: { planet: string; profitCents: number }[]) =>
  [...rows].sort(byProfitThenName).map((row) => row.planet);

describe("byProfitThenName", () => {
  it("puts the highest profit first and a loss last", () => {
    expect(
      names([
        { planet: "Mars", profitCents: 0 },
        { planet: "Venus", profitCents: -500 },
        { planet: "Saturn", profitCents: 900 },
      ]),
    ).toEqual(["Saturn", "Mars", "Venus"]);
  });

  it("orders equal profit by name", () => {
    expect(
      names([
        { planet: "Uranus", profitCents: 0 },
        { planet: "Neptune", profitCents: 0 },
        { planet: "Mercury", profitCents: 100 },
        { planet: "Jupiter", profitCents: 0 },
      ]),
    ).toEqual(["Mercury", "Jupiter", "Neptune", "Uranus"]);
  });
});
