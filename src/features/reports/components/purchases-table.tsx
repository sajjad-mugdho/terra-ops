import { Money } from "@/components/money";
import type { Purchases } from "../service";

// What the planet bought. No cost and no profit: a manager never gets them.
export function PurchasesTable({ purchases }: { purchases: Purchases }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Product</th>
            <th className="px-3 py-2 text-right font-normal">Units</th>
            <th className="px-3 py-2 text-right font-normal">Product amount</th>
            <th className="px-3 py-2 text-right font-normal">Delivery charges</th>
            <th className="px-3 py-2 text-right font-normal">Total paid</th>
          </tr>
        </thead>
        <tbody>
          {purchases.rows.map((row) => (
            <tr key={row.product} className="border-t">
              <td className="px-3 py-1.5">{row.product}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{row.units}</td>
              <td className="px-3 py-1.5 text-right">
                <Money cents={row.productAmountCents} />
              </td>
              <td className="px-3 py-1.5 text-right">
                <Money cents={row.deliveryChargesCents} />
              </td>
              <td className="px-3 py-1.5 text-right">
                <Money cents={row.totalPaidCents} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right tabular-nums">{purchases.total.units}</td>
            <td className="px-3 py-2 text-right">
              <Money cents={purchases.total.productAmountCents} />
            </td>
            <td className="px-3 py-2 text-right">
              <Money cents={purchases.total.deliveryChargesCents} />
            </td>
            <td className="px-3 py-2 text-right">
              <Money cents={purchases.total.totalPaidCents} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
