import { Fragment } from "react";
import { Money } from "@/components/money";
import type { CompanyTotals, PlanetProducts } from "../service";

type Props = { planets: PlanetProducts[]; totals: CompanyTotals };

export function PlanetProductTable({ planets, totals }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Planet and product</th>
            <th className="px-3 py-2 text-right font-normal">Units</th>
            <th className="px-3 py-2 text-right font-normal">Revenue</th>
            <th className="px-3 py-2 text-right font-normal">Making cost</th>
            <th className="px-3 py-2 text-right font-normal">Profit</th>
          </tr>
        </thead>
        <tbody>
          {planets.map((planet) => (
            <Fragment key={planet.planetId}>
              <tr className="border-t bg-muted/30 font-medium">
                <th scope="rowgroup" className="px-3 py-1.5 text-left font-medium">
                  {planet.planet}
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums">{planet.subtotal.units}</td>
                <td className="px-3 py-1.5 text-right">
                  <Money cents={planet.subtotal.revenueCents} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Money cents={planet.subtotal.makingCostCents} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Money cents={planet.subtotal.profitCents} />
                </td>
              </tr>
              {planet.rows.map((row) => (
                <tr key={row.product} className="border-t text-muted-foreground">
                  <td className="py-1.5 pr-3 pl-8">{row.product}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{row.units}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Money cents={row.revenueCents} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Money cents={row.makingCostCents} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Money cents={row.profitCents} />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="px-3 py-2">All planets</td>
            <td className="px-3 py-2 text-right tabular-nums">{totals.unitsDelivered}</td>
            <td className="px-3 py-2 text-right">
              <Money cents={totals.revenueCents} />
            </td>
            <td className="px-3 py-2 text-right">
              <Money cents={totals.makingCostCents} />
            </td>
            <td className="px-3 py-2 text-right">
              <Money cents={totals.profitCents} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
