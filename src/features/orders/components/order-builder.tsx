"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/features/locations/components/location-picker";
import type { PlanetNode } from "@/features/locations/service";
import { findDivision } from "@/features/locations/tree";
import type { ProductForSale } from "@/features/settings/service";
import { formatMoney } from "@/lib/money";
import { type Cart, cartQuery, cartUnits, isCartReady } from "../cart";
import { MAX_UNITS, orderTotals } from "../pricing";

type Props = { tree: PlanetNode[]; products: ProductForSale[]; initial: Cart };

export function OrderBuilder({ tree, products, initial }: Props) {
  const [cart, setCart] = useState(initial);

  const planet = findDivision(tree, cart.divisionId)?.planet;
  const deliveryCents = planet?.deliveryChargeCents ?? 0;
  const totalUnits = cartUnits(cart);
  const totals = orderTotals(
    products.map((product) => ({
      units: cart.units[product.id] ?? 0,
      unitPriceCents: product.priceCents,
      unitDeliveryChargeCents: deliveryCents,
    })),
  );

  const change = (productId: string, by: number) =>
    setCart((current) => ({
      ...current,
      units: { ...current.units, [productId]: Math.max(0, (current.units[productId] ?? 0) + by) },
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Delivery address</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationPicker
              tree={tree}
              divisionId={cart.divisionId}
              onChange={(divisionId) => setCart((current) => ({ ...current, divisionId }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>2. Products</span>
              <span className="text-sm font-normal text-muted-foreground" aria-live="polite">
                {totalUnits} / {MAX_UNITS} units
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {products.map((product) => {
                const units = cart.units[product.id] ?? 0;
                return (
                  <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(product.priceCents)} per unit
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`One less ${product.name}`}
                        disabled={units === 0}
                        onClick={() => change(product.id, -1)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-6 text-center tabular-nums">{units}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`One more ${product.name}`}
                        disabled={totalUnits >= MAX_UNITS}
                        onClick={() => change(product.id, 1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {totalUnits >= MAX_UNITS && (
              <p className="mt-2 text-sm text-muted-foreground">
                An order can have at most {MAX_UNITS} units.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Order total</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Product amount</dt>
              <dd className="tabular-nums">{formatMoney(totals.productAmountCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery charges</dt>
              <dd className="tabular-nums">
                {planet ? formatMoney(totals.deliveryChargesCents) : "Choose an address"}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(totals.totalCents)}</dd>
            </div>
          </dl>
          {isCartReady(cart) ? (
            <Button
              nativeButton={false}
              render={<Link href={`/customer/orders/new?${cartQuery(cart, "review")}`} />}
            >
              Continue to checkout
            </Button>
          ) : (
            <>
              <Button disabled>Continue to checkout</Button>
              <p className="text-xs text-muted-foreground">
                Choose a division and add 1 to {MAX_UNITS} units.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
