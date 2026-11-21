import { z } from "zod";

const units = z
  .number("Units must be a whole number")
  .int("Units must be a whole number")
  .min(0, "Units must be a whole number")
  .max(20, "An order can have at most 20 units");

export const placeOrderSchema = z.object({
  divisionId: z.uuid("Choose a delivery address"),
  items: z
    .array(z.object({ productId: z.uuid("Unknown product"), units }))
    .min(1, "Add at least one product")
    .max(50, "Too many lines"),
  expectedTotalCents: z.number().int().min(0),
  idempotencyKey: z.uuid(),
});

export const orderIdSchema = z.object({ orderId: z.uuid() });

export const rejectOrderSchema = z.object({
  orderId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Give a reason of at least 3 characters")
    .max(300, "The reason can be at most 300 characters"),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
