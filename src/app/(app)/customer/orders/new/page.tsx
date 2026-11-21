import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";
import { listLocationTree } from "@/features/locations/service";
import { findDivision } from "@/features/locations/tree";
import { type Cart, isCartReady, parseCart } from "@/features/orders/cart";
import { CheckoutSummary } from "@/features/orders/components/checkout-summary";
import { OrderBuilder } from "@/features/orders/components/order-builder";
import { listProducts } from "@/features/settings/service";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage({ searchParams }: PageProps<"/customer/orders/new">) {
  await requirePageRole("customer");
  const params = await searchParams;
  const [tree, products] = await Promise.all([listLocationTree(), listProducts()]);

  // The URL is user input: keep only divisions and products that exist.
  const fromUrl = parseCart(params);
  const destination = findDivision(tree, fromUrl.divisionId);
  const cart: Cart = {
    divisionId: destination?.division.id ?? null,
    units: Object.fromEntries(
      products
        .filter((product) => fromUrl.units[product.id])
        .map((product) => [product.id, fromUrl.units[product.id]]),
    ),
  };

  if (params.step === "review" && destination && isCartReady(cart)) {
    return (
      <>
        <PageHeader title="Checkout" description="Step 2 of 2. Check your order, then pay." />
        <CheckoutSummary
          cart={cart}
          destination={destination}
          products={products}
          idempotencyKey={randomUUID()}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="New order" description="Step 1 of 2. Choose where it goes and what you need." />
      <OrderBuilder tree={tree} products={products} initial={cart} />
    </>
  );
}
