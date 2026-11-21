import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { updatePlanetChargesAction } from "../actions";
import { fullShipCoversFuel } from "../break-even";
import type { PlanetForAdmiral } from "../service";
import { EditMoneyDialog } from "./edit-money-dialog";

export function PlanetTable({ planets }: { planets: PlanetForAdmiral[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Planet</th>
            <th className="px-3 py-2 text-right font-normal">Days from Earth</th>
            <th className="px-3 py-2 text-right font-normal">Delivery charge per unit</th>
            <th className="px-3 py-2 text-right font-normal">Fuel cost per trip</th>
            <th className="px-3 py-2 font-normal">Units needed to cover fuel</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {planets.map((planet) => (
            <tr key={planet.id} className="border-t">
              <td className="px-3 py-2 font-medium">{planet.name}</td>
              <td className="px-3 py-2 text-right tabular-nums">{planet.daysFromEarth}</td>
              <td className="px-3 py-2 text-right">
                <Money cents={planet.deliveryChargeCents} />
              </td>
              <td className="px-3 py-2 text-right">
                <Money cents={planet.fuelCostCents} />
              </td>
              <td className="px-3 py-2">
                <span className="flex flex-wrap items-center gap-2 tabular-nums">
                  {planet.unitsToCoverFuel ?? "Never covers fuel"}
                  {!fullShipCoversFuel(planet.unitsToCoverFuel) && (
                    <StatusBadge label="A full ship cannot cover the fuel cost" tone="danger" />
                  )}
                </span>
              </td>
              <td className="px-3 py-2">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
