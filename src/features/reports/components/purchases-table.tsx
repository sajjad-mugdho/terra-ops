import { Money } from "@/components/money";
import type { Purchases } from "../service";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// What the planet bought. No cost and no profit: a manager never gets them.
export function PurchasesTable({ purchases }: { purchases: Purchases }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Product amount</TableHead>
            <TableHead className="text-right">Delivery charges</TableHead>
            <TableHead className="text-right">Total paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.rows.map((row) => (
            <TableRow key={row.product}>
              <TableCell>{row.product}</TableCell>
              <TableCell className="text-right tabular-nums">{row.units}</TableCell>
              <TableCell className="text-right">
                <Money cents={row.productAmountCents} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={row.deliveryChargesCents} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={row.totalPaidCents} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right tabular-nums">{purchases.total.units}</TableCell>
            <TableCell className="text-right">
              <Money cents={purchases.total.productAmountCents} />
            </TableCell>
            <TableCell className="text-right">
              <Money cents={purchases.total.deliveryChargesCents} />
            </TableCell>
            <TableCell className="text-right">
              <Money cents={purchases.total.totalPaidCents} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
