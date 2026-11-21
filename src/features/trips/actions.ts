"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, toActionResult } from "@/lib/action-result";
import { planetIdSchema, tripIdSchema, tripOrderSchema, tripStopSchema } from "./schemas";
import {
  addOrderToTrip,
  cancelTrip,
  createTrip,
  markLanded,
  markLiftedOff,
  markLoaded,
  markStopAtSector,
  markStopDelivered,
  removeOrderFromTrip,
} from "./service";

const fields = (formData: FormData) => Object.fromEntries(formData);

// Every trip step shows on the captain's page and on the tracking pages of its orders.
function revalidateTripPages() {
  revalidatePath("/captain/trip");
  revalidatePath("/customer/orders");
  revalidatePath("/customer/orders/[id]", "page");
  revalidatePath("/manager/orders");
  revalidatePath("/manager/orders/[id]", "page");
}

async function run(message: string, change: () => Promise<unknown>): Promise<FormState> {
  try {
    await change();
  } catch (error) {
    const result = toActionResult(error);
    // A refused step usually means the page is stale.
    revalidateTripPages();
    return result;
  }
  revalidateTripPages();
  return { ok: true, data: { message } };
}

export async function createTripAction(_: FormState, formData: FormData): Promise<FormState> {
  return run("Trip started", async () => {
    await createTrip(planetIdSchema.parse(fields(formData)).planetId);
  });
}

export async function addOrderToTripAction(_: FormState, formData: FormData): Promise<FormState> {
  return run("Order added", async () => {
    const { tripId, orderId } = tripOrderSchema.parse(fields(formData));
    await addOrderToTrip(tripId, orderId);
  });
}

export async function removeOrderFromTripAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  return run("Order removed", async () => {
    const { tripId, orderId } = tripOrderSchema.parse(fields(formData));
    await removeOrderFromTrip(tripId, orderId);
  });
}

export async function cancelTripAction(_: FormState, formData: FormData): Promise<FormState> {
  return run("Trip cancelled", () => cancelTrip(tripIdSchema.parse(fields(formData)).tripId));
}

export async function markLoadedAction(_: FormState, formData: FormData): Promise<FormState> {
  return run("Trip loaded", () => markLoaded(tripIdSchema.parse(fields(formData)).tripId));
}

export async function markLiftedOffAction(_: FormState, formData: FormData): Promise<FormState> {
  return run("Lifted off", () => markLiftedOff(tripIdSchema.parse(fields(formData)).tripId));
}

export async function markLandedAction(_: FormState, formData: FormData): Promise<FormState> {
  return run("Landed", () => markLanded(tripIdSchema.parse(fields(formData)).tripId));
}

export async function markStopAtSectorAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  return run("Delivered to sector", async () => {
    const { tripId, divisionId } = tripStopSchema.parse(fields(formData));
    await markStopAtSector(tripId, divisionId);
  });
}

export async function markStopDeliveredAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  let completedTripId: string | null = null;
  const result = await run("Delivered to division", async () => {
    const { tripId, divisionId } = tripStopSchema.parse(fields(formData));
    const { completed } = await markStopDelivered(tripId, divisionId);
    if (completed) completedTripId = tripId;
  });
  // The open trip is gone now, so the summary is shown by ID.
  if (completedTripId) redirect(`/captain/trip?completed=${completedTripId}`);
  return result;
}
