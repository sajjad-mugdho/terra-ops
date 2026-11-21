import { describe, expect, it } from "vitest";
import { cartQuery, cartUnits, isCartReady, parseCart } from "./cart";

const WATER = "11111111-1111-4111-8111-111111111111";
const FOOD = "22222222-2222-4222-8222-222222222222";
const DIVISION = "33333333-3333-4333-8333-333333333333";

describe("cart in the URL", () => {
  it("survives a round trip", () => {
    const cart = { divisionId: DIVISION, units: { [WATER]: 3, [FOOD]: 1 } };
    const query = Object.fromEntries(new URLSearchParams(cartQuery(cart, "review")));
    expect(query.step).toBe("review");
    expect(parseCart(query)).toEqual(cart);
  });

  it("leaves out products with 0 units and an empty cart", () => {
    expect(cartQuery({ divisionId: null, units: { [WATER]: 0 } })).toBe("");
  });

  it("ignores junk instead of crashing", () => {
    const cart = parseCart({
      division: "mars",
      items: `${WATER}:3,nope:2,${FOOD}:-1,${FOOD}:1.5,${FOOD}:99,,${FOOD}`,
    });
    expect(cart).toEqual({ divisionId: null, units: { [WATER]: 3 } });
  });

  it("reads the first value when a parameter is repeated", () => {
    expect(parseCart({ division: [DIVISION, "x"], items: [`${WATER}:2`] })).toEqual({
      divisionId: DIVISION,
      units: { [WATER]: 2 },
    });
  });

  it("handles a URL with no cart", () => {
    expect(parseCart({})).toEqual({ divisionId: null, units: {} });
  });
});

describe("isCartReady", () => {
  it("needs a division and 1 to 20 units", () => {
    expect(isCartReady({ divisionId: DIVISION, units: { [WATER]: 1 } })).toBe(true);
    expect(isCartReady({ divisionId: DIVISION, units: { [WATER]: 20 } })).toBe(true);
    expect(isCartReady({ divisionId: null, units: { [WATER]: 1 } })).toBe(false);
    expect(isCartReady({ divisionId: DIVISION, units: {} })).toBe(false);
    expect(isCartReady({ divisionId: DIVISION, units: { [WATER]: 20, [FOOD]: 1 } })).toBe(false);
  });

  it("counts units across products", () => {
    expect(cartUnits({ divisionId: null, units: { [WATER]: 3, [FOOD]: 4 } })).toBe(7);
  });
});
