import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/features/auth/session";

export type ProductForSale = { id: string; name: string; priceCents: number };

// Safe for every role: making cost is never selected.
export async function listProducts(): Promise<ProductForSale[]> {
  await requireUser();
  return db
    .select({ id: products.id, name: products.name, priceCents: products.priceCents })
    .from(products)
    .orderBy(asc(products.name));
}
