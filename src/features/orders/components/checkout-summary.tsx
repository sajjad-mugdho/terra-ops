import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DivisionPath } from "@/features/locations/tree";
import type { ProductForSale } from "@/features/settings/service";
import { formatMoney } from "@/lib/money";
import { type Cart, cartQuery } from "../cart";
import { lineTotalCents, orderTotals } from "../pricing";
import { PlaceOrderForm } from "./place-order-form";

type Props = {
  cart: Cart;
  destination: DivisionPath;
  products: ProductForSale[];
  idempotencyKey: string;
};

export function CheckoutSummary({ cart, destination, products, idempotencyKey }: Props) {
  const { planet, sector, division } = destination;
  const lines = products
    .filter((product) => cart.units[product.id])
    .map((product) => ({
      productId: product.id,
      name: product.name,
      units: cart.units[product.id],
      unitPriceCents: product.priceCents,
      unitDeliveryChargeCents: planet.deliveryChargeCents,
    }));
  const totals = orderTotals(lines);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="text-muted-foreground">Deliver to</p>
            <p className="font-medium">
              {planet.name} · {sector.name} · {division.name}
            </p>
            <p className="text-muted-foreground">About {planet.daysFromEarth} days after lift-off</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 font-normal">Product</th>
                <th className="py-2 text-right font-normal">Units</th>
                <th className="py-2 text-right font-normal">Price</th>
                <th className="py-2 text-right font-normal">Delivery</th>
                <th className="py-2 text-right font-normal">Line total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.productId} className="border-b tabular-nums">
                  <td className="py-2">{line.name}</td>
                  <td className="py-2 text-right">{line.units}</td>
                  <td className="py-2 text-right">{formatMoney(line.unitPriceCents)}</td>
                  <td className="py-2 text-right">{formatMoney(line.unitDeliveryChargeCents)}</td>
                  <td className="py-2 text-right">{formatMoney(lineTotalCents(line))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            variant="outline"
            className="self-start"
            nativeButton={false}
            render={<Link href={`/customer/orders/new?${cartQuery(cart)}`} />}
          >
            Back
          </Button>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Product amount</dt>
              <dd className="tabular-nums">{formatMoney(totals.productAmountCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery charges</dt>
              <dd className="tabular-nums">{formatMoney(totals.deliveryChargesCents)}</dd>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-medium">
              <dt>Total ({totals.totalUnits} units)</dt>
              <dd className="tabular-nums">{formatMoney(totals.totalCents)}</dd>
            </div>
          </dl>
          <PlaceOrderForm
            divisionId={division.id}
            items={lines.map(({ productId, units }) => ({ productId, units }))}
            expectedTotalCents={totals.totalCents}
            idempotencyKey={idempotencyKey}
          />
        </CardContent>
      </Card>
    </div>
  );
}
