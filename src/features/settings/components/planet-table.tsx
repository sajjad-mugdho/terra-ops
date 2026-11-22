import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { updatePlanetChargesAction } from "../actions";
import { fullShipCoversFuel } from "../break-even";
import type { PlanetForAdmiral } from "../service";
import { EditMoneyDialog } from "./edit-money-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PlanetTable({ planets }: { planets: PlanetForAdmiral[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Planet</TableHead>
            <TableHead className="text-right">Days from Earth</TableHead>
            <TableHead className="text-right">Delivery charge per unit</TableHead>
            <TableHead className="text-right">Fuel cost per trip</TableHead>
            <TableHead>Units needed to cover fuel</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {planets.map((planet) => (
            <TableRow key={planet.id}>
              <TableCell className="font-medium">{planet.name}</TableCell>
              <TableCell className="text-right tabular-nums">{planet.daysFromEarth}</TableCell>
              <TableCell className="text-right">
                <Money cents={planet.deliveryChargeCents} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={planet.fuelCostCents} />
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap items-center gap-2 tabular-nums">
                  {planet.unitsToCoverFuel ?? "Never covers fuel"}
                  {!fullShipCoversFuel(planet.unitsToCoverFuel) && (
                    <StatusBadge label="A full ship cannot cover the fuel cost" tone="danger" />
                  )}
                </span>
              </TableCell>
              <TableCell>
                <EditMoneyDialog
                  id={planet.id}
                  title={`Edit ${planet.name}`}
                  action={updatePlanetChargesAction}
                  fields={[
                    {
                      name: "deliveryCharge",
                      label: "Delivery charge per unit",
                      cents: planet.deliveryChargeCents,
                      hint: "Applies to new orders only.",
                    },
                    {
                      name: "fuelCost",
                      label: "Fuel cost per trip",
                      cents: planet.fuelCostCents,
                      hint: "Applies to new trips only.",
                    },
                  ]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
