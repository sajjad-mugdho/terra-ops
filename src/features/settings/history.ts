import { formatMoney } from "@/lib/money";

export const SETTING_ENTITIES = ["product", "planet"] as const;

export type SettingEntity = (typeof SETTING_ENTITIES)[number];

export type SettingField = "price" | "making_cost" | "delivery_charge" | "fuel_cost";

export const ENTITY_LABEL: Record<SettingEntity, string> = { product: "Products", planet: "Planets" };

const FIELD_LABEL: Record<SettingField, string> = {
  price: "price",
  making_cost: "making cost",
  delivery_charge: "delivery charge",
  fuel_cost: "fuel cost",
};

// The filter from the URL. Anything unknown means "all".
export function parseEntity(value: unknown): SettingEntity | undefined {
  return SETTING_ENTITIES.find((entity) => entity === value);
}

// What changed, as the Admiral reads it: "Water · price".
export function changeLabel(entityName: string, field: SettingField): string {
  return `${entityName} · ${FIELD_LABEL[field]}`;
}

// Always signed, so the direction is clear: "+$2.00" or "-$2.00".
export function formatDifference(oldValueCents: number, newValueCents: number): string {
  const difference = newValueCents - oldValueCents;
  return `${difference > 0 ? "+" : ""}${formatMoney(difference)}`;
}
