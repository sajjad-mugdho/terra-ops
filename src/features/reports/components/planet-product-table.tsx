import { Fragment } from "react";
import { Money } from "@/components/money";
import type { CompanyTotals, PlanetProducts } from "../service";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = { planets: PlanetProducts[]; totals: CompanyTotals };

export function PlanetProductTable({ planets, totals }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Planet and product</TableHead>
            <TableHead className="text-right">Units</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Making cost</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planets.map((planet) => (
            <Fragment key={planet.planetId}>
              <TableRow className="bg-muted/30 font-medium">
                <TableHead scope="rowgroup" className="h-auto py-2">
                  {planet.planet}
                </TableHead>
                <TableCell className="text-right tabular-nums">{planet.subtotal.units}</TableCell>
                <TableCell className="text-right">
                  <Money cents={planet.subtotal.revenueCents} />
                </TableCell>
                <TableCell className="text-right">
                  <Money cents={planet.subtotal.makingCostCents} />
                </TableCell>
                <TableCell className="text-right">
                  <Money cents={planet.subtotal.profitCents} />
                </TableCell>
              </TableRow>
              {planet.rows.map((row) => (
                <TableRow key={row.product} className="text-muted-foreground">
                  <TableCell className="pl-8">{row.product}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.units}</TableCell>
                  <TableCell className="text-right">
                    <Money cents={row.revenueCents} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={row.makingCostCents} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money cents={row.profitCents} />
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell>All planets</TableCell>
            <TableCell className="text-right tabular-nums">{totals.unitsDelivered}</TableCell>
            <TableCell className="text-right">
              <Money cents={totals.revenueCents} />
            </TableCell>
            <TableCell className="text-right">
              <Money cents={totals.makingCostCents} />
            </TableCell>
            <TableCell className="text-right">
              <Money cents={totals.profitCents} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
