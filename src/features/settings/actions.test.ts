import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { settingsChanges } from "@/db/schema";
import { seedReference } from "@/seed/reference";
import { ADMIRAL, ALL_ACTORS, CAPTAIN, MARS_MANAGER, planetId, productId, resetSettings } from "@/test/orders";
import { actAsNobody, signInAll, switchTo } from "@/test/session";
import * as actions from "./actions";
import { updatePlanetChargesAction, updateProductAction } from "./actions";
import { listPlanetsForAdmiral, listProductsForAdmiral } from "./service";

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeAll(async () => {
  await seedReference();
  await signInAll(ALL_ACTORS);
});

beforeEach(async () => {
  await resetSettings();
  vi.clearAllMocks();
  switchTo(ADMIRAL);
});

describe("updateProductAction", () => {
  it("turns dollar text into cents, saves and refreshes the products page and checkout", async () => {
    const id = await productId("Water");
    const result = await updateProductAction(null, form({ id, price: "12", makingCost: "7.5" }));

    expect(result).toEqual({ ok: true, data: { message: "Saved" } });
    expect((await listProductsForAdmiral()).find((product) => product.id === id)).toMatchObject({
      priceCents: 1200,
      makingCostCents: 750,
    });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admiral/products");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/customer/orders/new");
  });

  it("says nothing changed when the values are the same, and writes no history", async () => {
    const id = await productId("Water");
    const result = await updateProductAction(null, form({ id, price: "10.00", makingCost: "6" }));
    expect(result).toEqual({ ok: true, data: { message: "Nothing changed" } });
    expect(await db.$count(settingsChanges)).toBe(0);
  });

  it.each([
    ["", "Enter an amount"],
    ["-1", "The amount cannot be negative"],
    ["1.234", "Enter a number with at most 2 decimals, like 12.50"],
    ["ten", "Enter a number with at most 2 decimals, like 12.50"],
    ["1000000.01", "The amount can be at most $1,000,000"],
  ])("gives a field error for the price %j and keeps what was typed", async (price, message) => {
    const id = await productId("Water");
    const result = await updateProductAction(null, form({ id, price, makingCost: "6" }));

    expect(result).toEqual({
      ok: false,
      error: "Please check your input",
      fieldErrors: { price: [message] },
      values: { price, makingCost: "6" },
    });
    expect(await db.$count(settingsChanges)).toBe(0);
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });

  it("gives a field error for a missing making cost", async () => {
    const id = await productId("Water");
    const result = await updateProductAction(null, form({ id, price: "10" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { makingCost: ["Enter an amount"] } });
  });

  it("answers Not found for an unknown product", async () => {
    const id = await planetId("Mars");
    const result = await updateProductAction(null, form({ id, price: "1", makingCost: "1" }));
    expect(result).toMatchObject({ ok: false, error: "Not found" });
  });

  it("refuses other roles and a visitor", async () => {
    const data = form({ id: await productId("Water"), price: "1", makingCost: "1" });
    switchTo(MARS_MANAGER);
    expect(await updateProductAction(null, data)).toMatchObject({ ok: false, error: "Not allowed" });
    switchTo(CAPTAIN);
    expect(await updateProductAction(null, data)).toMatchObject({ ok: false, error: "Not allowed" });
    actAsNobody();
    expect(await updateProductAction(null, data)).toMatchObject({ ok: false, error: "Please log in again" });
    expect(await db.$count(settingsChanges)).toBe(0);
  });
});

describe("updatePlanetChargesAction", () => {
  it("saves both charges and refreshes the planets page", async () => {
    const id = await planetId("Mars");
    const result = await updatePlanetChargesAction(null, form({ id, deliveryCharge: "0", fuelCost: "45.5" }));

    expect(result).toEqual({ ok: true, data: { message: "Saved" } });
    expect((await listPlanetsForAdmiral()).find((planet) => planet.id === id)).toMatchObject({
      deliveryChargeCents: 0,
      fuelCostCents: 4550,
      unitsToCoverFuel: null,
    });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admiral/planets");
  });

  it("says nothing changed when the values are the same", async () => {
    const id = await planetId("Mars");
    const result = await updatePlanetChargesAction(null, form({ id, deliveryCharge: "5", fuelCost: "40" }));
    expect(result).toEqual({ ok: true, data: { message: "Nothing changed" } });
  });

  it("gives a field error per bad field and keeps what was typed", async () => {
    const id = await planetId("Mars");
    const result = await updatePlanetChargesAction(null, form({ id, deliveryCharge: "-5", fuelCost: "" }));
    expect(result).toEqual({
      ok: false,
      error: "Please check your input",
      fieldErrors: {
        deliveryCharge: ["The amount cannot be negative"],
        fuelCost: ["Enter an amount"],
      },
      values: { deliveryCharge: "-5", fuelCost: "" },
    });
  });

  it("refuses a manager", async () => {
    switchTo(MARS_MANAGER);
    const data = form({ id: await planetId("Mars"), deliveryCharge: "1", fuelCost: "1" });
    expect(await updatePlanetChargesAction(null, data)).toMatchObject({ ok: false, error: "Not allowed" });
  });
});

describe("settings actions", () => {
  it("has no action that edits or deletes a history row", () => {
    expect(Object.keys(actions).sort()).toEqual(["updatePlanetChargesAction", "updateProductAction"]);
  });
});
