"use server";

import { revalidatePath } from "next/cache";
import { type FormState, toActionResult } from "@/lib/action-result";
import { updatePlanetChargesSchema, updateProductSchema } from "./schemas";
import { updatePlanetCharges, updateProduct } from "./service";

// values: what the Admiral typed, so the dialog can show it again after an error.
export type MoneyFormState = (NonNullable<FormState> & { values?: Record<string, string> }) | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

const saved = (changed: boolean): MoneyFormState => ({
  ok: true,
  data: { message: changed ? "Saved" : "Nothing changed" },
});

export async function updateProductAction(
  _: MoneyFormState,
  formData: FormData,
): Promise<MoneyFormState> {
  const values = { price: text(formData, "price"), makingCost: text(formData, "makingCost") };
  let changed: boolean;
  try {
    const input = updateProductSchema.parse({ productId: text(formData, "id"), ...values });
    const result = await updateProduct(input.productId, {
      priceCents: input.price,
      makingCostCents: input.makingCost,
    });
    changed = result.changed;
  } catch (error) {
    return { ...toActionResult(error), values };
  }
  revalidatePath("/admiral/products");
  revalidatePath("/customer/orders/new");
  return saved(changed);
}

export async function updatePlanetChargesAction(
  _: MoneyFormState,
  formData: FormData,
): Promise<MoneyFormState> {
  const values = {
    deliveryCharge: text(formData, "deliveryCharge"),
    fuelCost: text(formData, "fuelCost"),
  };
  let changed: boolean;
  try {
    const input = updatePlanetChargesSchema.parse({ planetId: text(formData, "id"), ...values });
    const result = await updatePlanetCharges(input.planetId, {
      deliveryChargeCents: input.deliveryCharge,
      fuelCostCents: input.fuelCost,
    });
    changed = result.changed;
  } catch (error) {
    return { ...toActionResult(error), values };
  }
  revalidatePath("/admiral/planets");
  revalidatePath("/customer/orders/new");
  revalidatePath("/captain/trip");
  return saved(changed);
}
