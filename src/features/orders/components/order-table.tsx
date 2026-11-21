import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderListRow } from "../service";
import { customerLabel, orderCode, orderTone } from "../status";
import { waitingOf } from "../waiting";
import { WaitingTime } from "./waiting-time";

type Row = OrderListRow & { customerName?: string; waitingSince?: Date | null };

type Props = { rows: Row[]; basePath: string; now?: Date };

// The waiting column appears only for rows that carry waitingSince: managers and the Admiral.
export function OrderTable({ rows, basePath, now }: Props) {
  const withCustomer = rows.some((row) => row.customerName !== undefined);
  const withWaiting = now !== undefined && rows.some((row) => row.waitingSince !== undefined);

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
            {withWaiting && <th className="px-3 py-2 font-normal">Waiting</th>}
            <th className="px-3 py-2 font-normal">Placed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const waiting = withWaiting ? waitingOf(row.waitingSince ?? null, now) : null;
            return (
              <tr key={row.id} className={cn("border-t", waiting?.overdue && "bg-destructive/5")}>
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
                {withWaiting && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    {waiting ? <WaitingTime waiting={waiting} /> : <span className="text-muted-foreground">Not waiting</span>}
                  </td>
                )}
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {formatUtc(row.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
