import { describe, expect, it } from "vitest";
import { changeLabel, ENTITY_LABEL, formatDifference, parseEntity, SETTING_ENTITIES } from "./history";

describe("parseEntity", () => {
  it.each(SETTING_ENTITIES)("keeps %s", (entity) => {
    expect(parseEntity(entity)).toBe(entity);
  });

  it.each([undefined, null, "", "all", "Product", "products", " planet", "user", "1", 1, ["product"], {}])(
    "treats %j as all",
    (value) => {
      expect(parseEntity(value)).toBeUndefined();
    },
  );
});

describe("changeLabel", () => {
  it.each([
    ["Water", "price", "Water · price"],
    ["Water", "making_cost", "Water · making cost"],
    ["Mars", "delivery_charge", "Mars · delivery charge"],
    ["Mars", "fuel_cost", "Mars · fuel cost"],
  ] as const)("names %s %s as %s", (entityName, field, label) => {
    expect(changeLabel(entityName, field)).toBe(label);
  });
});

describe("formatDifference", () => {
  it.each([
    [800, 1000, "+$2.00"],
    [1000, 800, "-$2.00"],
    [0, 1, "+$0.01"],
    [1, 0, "-$0.01"],
    [0, 100_000_000, "+$1,000,000.00"],
    [100_000_000, 0, "-$1,000,000.00"],
    [1250, 1999, "+$7.49"],
  ])("shows %i to %i as %s", (oldValue, newValue, text) => {
    expect(formatDifference(oldValue, newValue)).toBe(text);
  });
});

describe("ENTITY_LABEL", () => {
  it("has a label for every entity", () => {
    expect(SETTING_ENTITIES.map((entity) => ENTITY_LABEL[entity])).toEqual(["Products", "Planets"]);
  });
});
