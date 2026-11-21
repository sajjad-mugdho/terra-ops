import { ActionButton } from "@/components/action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { createTripAction } from "../actions";
import type { TripPlanet } from "../service";

export function PlanetChooser({ planets }: { planets: TripPlanet[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {planets.map((planet) => (
        <Card key={planet.id}>
          <CardHeader>
            <CardTitle>{planet.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <dl className="grid grid-cols-[1fr_auto] gap-y-1">
              <dt className="text-muted-foreground">Days from Earth</dt>
              <dd className="text-right tabular-nums">{planet.daysFromEarth}</dd>
              <dt className="text-muted-foreground">Fuel cost</dt>
              <dd className="text-right tabular-nums">{formatMoney(planet.fuelCostCents)}</dd>
              <dt className="text-muted-foreground">Waiting orders</dt>
              <dd className="text-right tabular-nums">
                {planet.waitingOrders} ({planet.waitingUnits} units)
              </dd>
            </dl>
            <ActionButton action={createTripAction} fields={{ planetId: planet.id }}>
              Start trip
            </ActionButton>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
