import Link from "next/link";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { formatUtc } from "@/lib/dates";
import type { TripRow } from "../service";
import { isOpenTrip, tripCode, tripLabel, tripTone } from "../status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = TripRow & { captainName?: string };

type Props = { rows: Row[]; basePath: "/captain/trips" | "/admiral/trips" };

export function TripTable({ rows, basePath }: Props) {
  const withCaptain = rows.some((row) => row.captainName !== undefined);

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Trip</TableHead>
            {withCaptain && <TableHead>Captain</TableHead>}
            <TableHead>Planet</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Earnings</TableHead>
            <TableHead className="text-right">Fuel</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const cancelled = row.status === "CANCELLED";
            const loss = row.profitCents < 0;
            return (
              <TableRow key={row.id} className={loss ? "bg-destructive/5" : undefined}>
                <TableCell className="font-medium">
                  <Link href={`${basePath}/${row.id}`} className="underline-offset-4 hover:underline">
                    {tripCode(row.number)}
                  </Link>
                </TableCell>
                {withCaptain && <TableCell>{row.captainName}</TableCell>}
                <TableCell>{row.planet}</TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    <StatusBadge label={tripLabel(row.status)} tone={tripTone(row.status)} />
                    {loss && <StatusBadge label={isOpenTrip(row.status) ? "Expected loss" : "Loss"} tone="danger" />}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.totalUnits}</TableCell>
                <TableCell className="text-right">
                  <Money cents={row.earningsCents} />
                </TableCell>
                {/* A cancelled trip never flew, so it has no fuel cost and no profit. */}
                <TableCell className="text-right">
                  {cancelled ? <Money cents={0} /> : <Money cents={row.fuelCostCents} />}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Money cents={row.profitCents} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatUtc(row.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.completedAt ? formatUtc(row.completedAt) : "Not yet"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
