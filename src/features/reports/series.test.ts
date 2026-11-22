import { describe, expect, it } from "vitest";
import { bucketLabel, percentChange, previousPeriod, seriesUnit } from "./series";

const DAY = 86_400_000;
const from = new Date("2026-01-01T00:00:00Z");
const days = (count: number) => ({ start: from, end: new Date(from.getTime() + count * DAY) });

describe("seriesUnit", () => {
  it.each([
    [1, "day"],
    [31, "day"],
    [92, "day"],
    [93, "month"],
    [365, "month"],
    [3660, "month"],
    [3661, "year"],
    [36500, "year"],
  ] as const)("%i days -> %s", (count, unit) => {
    expect(seriesUnit(days(count))).toBe(unit);
  });
});

describe("previousPeriod", () => {
  it("has the same length and ends where the period starts", () => {
    expect(previousPeriod(days(31))).toEqual({ start: new Date("2025-12-01T00:00:00Z"), end: from });
  });
});

describe("percentChange", () => {
  it.each([
    [150, 100, 50],
    [50, 100, -50],
    [100, 100, 0],
    [0, 100, -100],
    [100, -100, 200],
  ])("%i after %i -> %i%%", (current, previous, change) => {
    expect(percentChange(current, previous)).toBe(change);
  });

  it("is null when there was nothing before", () => {
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("bucketLabel", () => {
  it.each([
    ["2026-10-23", "day", "23 Oct"],
    ["2026-10-01", "month", "Oct 2026"],
    ["2026-01-01", "year", "2026"],
  ] as const)("%s by %s -> %s", (date, unit, label) => {
    expect(bucketLabel(date, unit)).toBe(label);
  });
});
