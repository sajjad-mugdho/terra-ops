import { Money } from "@/components/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdmiralOrderDetail } from "../service";

// Admiral only: what the company made on this order, from the frozen lines.
export function OrderProfitCard({ order }: { order: AdmiralOrderDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profit</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 font-normal">Product</th>
              <th className="py-2 text-right font-normal">Units</th>
              <th className="py-2 text-right font-normal">Price</th>
              <th className="py-2 text-right font-normal">Making cost</th>
              <th className="py-2 text-right font-normal">Profit</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productName} className="border-b">
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-right tabular-nums">{item.units}</td>
                <td className="py-2 text-right">
                  <Money cents={item.unitPriceCents} />
                </td>
                <td className="py-2 text-right">
                  <Money cents={item.unitMakingCostCents} />
                </td>
                <td className="py-2 text-right">
                  <Money cents={item.units * (item.unitPriceCents - item.unitMakingCostCents)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 ml-auto flex max-w-xs flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Revenue (product amount)</dt>
            <dd>
              <Money cents={order.productAmountCents} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Making cost</dt>
            <dd>
              <Money cents={order.makingCostCents} />
            </dd>
          </div>
          <div className="flex justify-between border-t pt-1.5 font-medium">
            <dt>Profit</dt>
            <dd>
              <Money cents={order.profitCents} />
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {order.status === "DELIVERED"
            ? "This order is delivered, so it counts on the dashboard."
            : "This order counts on the dashboard only when it is delivered."}{" "}
          Delivery charges go to the captain.
        </p>
      </CardContent>
    </Card>
  );
}
