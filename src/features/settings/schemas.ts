import { z } from "zod";
import { parseDollarsToCents } from "@/lib/money";
import { MAX_MONEY_CENTS } from "./break-even";

// Dollar text from a form, turned into integer cents on the server.
const money = z
  .string()
  .trim()
  .transform((text, ctx) => {
    const issue = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };
    if (text === "") return issue("Enter an amount");
    if (text.startsWith("-")) return issue("The amount cannot be negative");
    const cents = parseDollarsToCents(text);
    if (cents === null) return issue("Enter a number with at most 2 decimals, like 12.50");
    if (cents > MAX_MONEY_CENTS) return issue("The amount can be at most $1,000,000");
    return cents;
  });

export const updateProductSchema = z.object({
  productId: z.uuid(),
  price: money,
  makingCost: money,
});

export const updatePlanetChargesSchema = z.object({
  planetId: z.uuid(),
  deliveryCharge: money,
  fuelCost: money,
});

export type ProductValues = { priceCents: number; makingCostCents: number };

export type PlanetChargeValues = { deliveryChargeCents: number; fuelCostCents: number };
