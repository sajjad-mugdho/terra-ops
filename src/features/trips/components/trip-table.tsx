import Link from "next/link";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { formatUtc } from "@/lib/dates";
import type { TripRow } from "../service";
import { isOpenTrip, tripCode, tripLabel, tripTone } from "../status";

type Row = TripRow & { captainName?: string };

type Props = { rows: Row[]; basePath: "/captain/trips" | "/admiral/trips" };

export function TripTable({ rows, basePath }: Props) {
  const withCaptain = rows.some((row) => row.captainName !== undefined);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Trip</th>
            {withCaptain && <th className="px-3 py-2 font-normal">Captain</th>}
            <th className="px-3 py-2 font-normal">Planet</th>
            <th className="px-3 py-2 font-normal">Status</th>
            <th className="px-3 py-2 text-right font-normal">Units</th>
            <th className="px-3 py-2 text-right font-normal">Earnings</th>
            <th className="px-3 py-2 text-right font-normal">Fuel</th>
            <th className="px-3 py-2 text-right font-normal">Profit</th>
            <th className="px-3 py-2 font-normal">Created</th>
            <th className="px-3 py-2 font-normal">Completed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cancelled = row.status === "CANCELLED";
            const loss = row.profitCents < 0;
            return (
              <tr key={row.id} className={loss ? "border-t bg-destructive/5" : "border-t"}>
                <td className="px-3 py-2 font-medium">
                  <Link href={`${basePath}/${row.id}`} className="underline-offset-4 hover:underline">
                    {tripCode(row.number)}
                  </Link>
                </td>
                {withCaptain && <td className="px-3 py-2">{row.captainName}</td>}
                <td className="px-3 py-2">{row.planet}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    <StatusBadge label={tripLabel(row.status)} tone={tripTone(row.status)} />
                    {loss && <StatusBadge label={isOpenTrip(row.status) ? "Expected loss" : "Loss"} tone="danger" />}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{row.totalUnits}</td>
                <td className="px-3 py-2 text-right">
                  <Money cents={row.earningsCents} />
                </td>
                {/* A cancelled trip never flew, so it has no fuel cost and no profit. */}
                <td className="px-3 py-2 text-right">
                  {cancelled ? <Money cents={0} /> : <Money cents={row.fuelCostCents} />}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  <Money cents={row.profitCents} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {formatUtc(row.createdAt)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {row.completedAt ? formatUtc(row.completedAt) : "Not yet"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
