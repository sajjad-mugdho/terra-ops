import { z } from "zod";

export const planetIdSchema = z.object({ planetId: z.uuid("Choose a planet") });

export const tripIdSchema = z.object({ tripId: z.uuid() });

export const tripOrderSchema = z.object({ tripId: z.uuid(), orderId: z.uuid() });

export const tripStopSchema = z.object({ tripId: z.uuid(), divisionId: z.uuid() });
