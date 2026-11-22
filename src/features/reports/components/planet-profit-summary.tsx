import { Money } from "@/components/money";
import type { PlanetProfit } from "../service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// The first answer on the dashboard: which planets are profitable (D32).
export function PlanetProfitSummary({ rows }: { rows: PlanetProfit[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Planet</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Making cost</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.planetId}>
              <TableCell className="font-medium">{row.planet}</TableCell>
              <TableCell className="text-right tabular-nums">{row.units}</TableCell>
              <TableCell className="text-right">
                <Money cents={row.revenueCents} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={row.makingCostCents} />
              </TableCell>
              <TableCell className="text-right font-medium">
                <Money cents={row.profitCents} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
