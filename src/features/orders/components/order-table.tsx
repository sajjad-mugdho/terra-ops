import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { OrderListRow } from "../service";
import { customerLabel, orderCode, orderTone } from "../status";

type Row = OrderListRow & { customerName?: string };

export function OrderTable({ rows, basePath }: { rows: Row[]; basePath: string }) {
  const withCustomer = rows.some((row) => row.customerName !== undefined);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Order</th>
            {withCustomer && <th className="px-3 py-2 font-normal">Customer</th>}
            <th className="px-3 py-2 font-normal">Destination</th>
            <th className="px-3 py-2 text-right font-normal">Units</th>
            <th className="px-3 py-2 text-right font-normal">Total</th>
            <th className="px-3 py-2 font-normal">Status</th>
            <th className="px-3 py-2 font-normal">Placed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-3 py-2 font-medium">
                <Link href={`${basePath}/${row.id}`} className="underline-offset-4 hover:underline">
                  {orderCode(row.number)}
                </Link>
              </td>
              {withCustomer && <td className="px-3 py-2">{row.customerName}</td>}
              <td className="px-3 py-2">
                {row.destination.planet} · {row.destination.sector} · {row.destination.division}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{row.totalUnits}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.totalCents)}</td>
              <td className="px-3 py-2">
                <span className="flex flex-wrap gap-1">
                  <StatusBadge label={customerLabel(row.status)} tone={orderTone(row.status)} />
                  {row.paymentStatus === "REFUNDED" && <StatusBadge label="Refunded" tone="danger" />}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {formatUtc(row.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
