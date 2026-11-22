import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderListRow } from "../service";
import { customerLabel, orderCode, orderTone } from "../status";
import { waitingOf } from "../waiting";
import { WaitingTime } from "./waiting-time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = OrderListRow & { customerName?: string; waitingSince?: Date | null };

type Props = { rows: Row[]; basePath: string; now?: Date };

// The waiting column appears only for rows that carry waitingSince: managers and the Admiral.
export function OrderTable({ rows, basePath, now }: Props) {
  const withCustomer = rows.some((row) => row.customerName !== undefined);
  const withWaiting = now !== undefined && rows.some((row) => row.waitingSince !== undefined);

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Order</TableHead>
            {withCustomer && <TableHead>Customer</TableHead>}
            <TableHead>Destination</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            {withWaiting && <TableHead>Waiting</TableHead>}
            <TableHead>Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const waiting = withWaiting ? waitingOf(row.waitingSince ?? null, now) : null;
            return (
              <TableRow key={row.id} className={cn(waiting?.overdue && "bg-destructive/5")}>
                <TableCell className="font-medium">
                  <Link href={`${basePath}/${row.id}`} className="underline-offset-4 hover:underline">
                    {orderCode(row.number)}
                  </Link>
                </TableCell>
                {withCustomer && <TableCell>{row.customerName}</TableCell>}
                <TableCell>
                  {row.destination.planet} · {row.destination.sector} · {row.destination.division}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.totalUnits}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.totalCents)}</TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    <StatusBadge label={customerLabel(row.status)} tone={orderTone(row.status)} />
                    {row.paymentStatus === "REFUNDED" && <StatusBadge label="Refunded" tone="danger" />}
                  </span>
                </TableCell>
                {withWaiting && (
                  <TableCell>
                    {waiting ? <WaitingTime waiting={waiting} /> : <span className="text-muted-foreground">Not waiting</span>}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">
                  {formatUtc(row.createdAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
