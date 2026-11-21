"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, toActionResult } from "@/lib/action-result";
import { AppError } from "@/lib/errors";
import { orderIdSchema, placeOrderSchema, rejectOrderSchema } from "./schemas";
import { acceptOrder, placeOrder, rejectOrder } from "./service";

// reason: what the manager typed, so the dialog can show it again.
export type RejectFormState = (NonNullable<FormState> & { reason?: string }) | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function parseItems(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function revalidateManagerPages() {
  revalidatePath("/manager/queue");
  revalidatePath("/manager/orders");
  revalidatePath("/manager/orders/[id]", "page");
}

export async function placeOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  let orderId: string;
  try {
    const input = placeOrderSchema.parse({
      divisionId: text(formData, "divisionId"),
      items: parseItems(text(formData, "items")),
      expectedTotalCents: Number(text(formData, "expectedTotalCents")),
      idempotencyKey: text(formData, "idempotencyKey"),
    });
    orderId = (await placeOrder(input)).id;
  } catch (error) {
    // Prices changed: reload the summary so the customer confirms the new total.
    if (error instanceof AppError && error.code === "CONFLICT") refresh();
    return toActionResult(error);
  }
  revalidatePath("/customer/orders");
  redirect(`/customer/orders/${orderId}`);
}

export async function acceptOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await acceptOrder(orderIdSchema.parse({ orderId: text(formData, "orderId") }).orderId);
  } catch (error) {
    if (error instanceof AppError) revalidateManagerPages();
    return toActionResult(error);
  }
  revalidateManagerPages();
  return { ok: true, data: { message: "Order accepted" } };
}

export async function rejectOrderAction(
  _: RejectFormState,
  formData: FormData,
): Promise<RejectFormState> {
  const reason = text(formData, "reason");
  try {
    const input = rejectOrderSchema.parse({ orderId: text(formData, "orderId"), reason });
    await rejectOrder(input.orderId, input.reason);
  } catch (error) {
    if (error instanceof AppError) revalidateManagerPages();
    return { ...toActionResult(error), reason };
  }
  revalidateManagerPages();
  return { ok: true, data: { message: "Order rejected" } };
}
