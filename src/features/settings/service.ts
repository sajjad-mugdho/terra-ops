import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { planets, products, settingsChanges } from "@/db/schema";
import { requireRole, requireUser } from "@/features/auth/session";
import { AppError } from "@/lib/errors";
import { isMoneyCents, marginCents, unitsToCoverFuel } from "./break-even";
import type { PlanetChargeValues, ProductValues } from "./schemas";

export type ProductForSale = { id: string; name: string; priceCents: number };

export type ProductForAdmiral = ProductForSale & {
  makingCostCents: number;
  marginCents: number;
  sellsAtLoss: boolean;
};

export type PlanetForAdmiral = {
  id: string;
  name: string;
  daysFromEarth: number;
  deliveryChargeCents: number;
  fuelCostCents: number;
  unitsToCoverFuel: number | null;
};

type SettingField = (typeof settingsChanges.$inferInsert)["field"];

type Change = { field: SettingField; oldValueCents: number; newValueCents: number };

const isUuid = (value: string) => z.uuid().safeParse(value).success;

function assertMoney(...values: number[]) {
  if (!values.every(isMoneyCents)) throw new AppError("INVALID", "Enter an amount from $0 to $1,000,000");
}

const changed = (changes: Change[]) =>
  changes.filter((change) => change.oldValueCents !== change.newValueCents);

// Safe for every role: making cost is never selected.
export async function listProducts(): Promise<ProductForSale[]> {
  await requireUser();
  return db
    .select({ id: products.id, name: products.name, priceCents: products.priceCents })
    .from(products)
    .orderBy(asc(products.name));
}

export async function listProductsForAdmiral(): Promise<ProductForAdmiral[]> {
  await requireRole("admiral");
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      priceCents: products.priceCents,
      makingCostCents: products.makingCostCents,
    })
    .from(products)
    .orderBy(asc(products.name));
  return rows.map((row) => ({
    ...row,
    marginCents: marginCents(row.priceCents, row.makingCostCents),
    sellsAtLoss: row.priceCents < row.makingCostCents,
  }));
}

export async function updateProduct(id: string, values: ProductValues): Promise<{ changed: boolean }> {
  const admiral = await requireRole("admiral");
  assertMoney(values.priceCents, values.makingCostCents);
  if (!isUuid(id)) throw new AppError("NOT_FOUND");

  return db.transaction(async (tx) => {
    // The row lock makes two saves run one after the other, so each old value is the real one.
    const [current] = await tx
      .select({ priceCents: products.priceCents, makingCostCents: products.makingCostCents })
      .from(products)
      .where(eq(products.id, id))
      .for("update");
    if (!current) throw new AppError("NOT_FOUND");

    const changes = changed([
      { field: "price", oldValueCents: current.priceCents, newValueCents: values.priceCents },
      {
        field: "making_cost",
        oldValueCents: current.makingCostCents,
        newValueCents: values.makingCostCents,
      },
    ]);
    if (changes.length === 0) return { changed: false };

    await tx
      .update(products)
      .set({ priceCents: values.priceCents, makingCostCents: values.makingCostCents })
      .where(eq(products.id, id));
    await tx
      .insert(settingsChanges)
      .values(changes.map((change) => ({ ...change, actorId: admiral.id, productId: id })));
    return { changed: true };
  });
}

export async function listPlanetsForAdmiral(): Promise<PlanetForAdmiral[]> {
  await requireRole("admiral");
  const rows = await db
    .select({
      id: planets.id,
      name: planets.name,
      daysFromEarth: planets.daysFromEarth,
      deliveryChargeCents: planets.deliveryChargeCents,
      fuelCostCents: planets.fuelCostCents,
    })
    .from(planets)
    .orderBy(asc(planets.daysFromEarth), asc(planets.name));
  return rows.map((row) => ({
    ...row,
    unitsToCoverFuel: unitsToCoverFuel(row.fuelCostCents, row.deliveryChargeCents),
  }));
}

export async function updatePlanetCharges(
  id: string,
  values: PlanetChargeValues,
): Promise<{ changed: boolean }> {
  const admiral = await requireRole("admiral");
  assertMoney(values.deliveryChargeCents, values.fuelCostCents);
  if (!isUuid(id)) throw new AppError("NOT_FOUND");

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        deliveryChargeCents: planets.deliveryChargeCents,
        fuelCostCents: planets.fuelCostCents,
      })
      .from(planets)
      .where(eq(planets.id, id))
      .for("update");
    if (!current) throw new AppError("NOT_FOUND");

    const changes = changed([
      {
        field: "delivery_charge",
        oldValueCents: current.deliveryChargeCents,
        newValueCents: values.deliveryChargeCents,
      },
      { field: "fuel_cost", oldValueCents: current.fuelCostCents, newValueCents: values.fuelCostCents },
    ]);
    if (changes.length === 0) return { changed: false };

    await tx
      .update(planets)
      .set({ deliveryChargeCents: values.deliveryChargeCents, fuelCostCents: values.fuelCostCents })
      .where(eq(planets.id, id));
    await tx
      .insert(settingsChanges)
      .values(changes.map((change) => ({ ...change, actorId: admiral.id, planetId: id })));
    return { changed: true };
  });
}
