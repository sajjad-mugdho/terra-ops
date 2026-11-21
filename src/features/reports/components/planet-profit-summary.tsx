import { Money } from "@/components/money";
import type { PlanetProfit } from "../service";

// The first answer on the dashboard: which planets are profitable (D32).
export function PlanetProfitSummary({ rows }: { rows: PlanetProfit[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Planet</th>
            <th className="px-3 py-2 text-right font-normal">Units</th>
            <th className="px-3 py-2 text-right font-normal">Revenue</th>
            <th className="px-3 py-2 text-right font-normal">Making cost</th>
            <th className="px-3 py-2 text-right font-normal">Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.planetId} className="border-t">
              <td className="px-3 py-1.5 font-medium">{row.planet}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{row.units}</td>
              <td className="px-3 py-1.5 text-right">
                <Money cents={row.revenueCents} />
              </td>
              <td className="px-3 py-1.5 text-right">
                <Money cents={row.makingCostCents} />
              </td>
              <td className="px-3 py-1.5 text-right font-medium">
                <Money cents={row.profitCents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
