import { Money } from "@/components/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdmiralOrderDetail } from "../service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Admiral only: what the company made on this order, from the frozen lines.
export function OrderProfitCard({ order }: { order: AdmiralOrderDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profit</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Making cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.productName}>
                <TableCell>{item.productName}</TableCell>
                <TableCell className="text-right tabular-nums">{item.units}</TableCell>
                <TableCell className="text-right">
                  <Money cents={item.unitPriceCents} />
                </TableCell>
                <TableCell className="text-right">
                  <Money cents={item.unitMakingCostCents} />
                </TableCell>
                <TableCell className="text-right">
                  <Money cents={item.units * (item.unitPriceCents - item.unitMakingCostCents)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
