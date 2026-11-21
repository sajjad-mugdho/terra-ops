import { ActionButton } from "@/components/action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fullShipCoversFuel } from "@/features/settings/break-even";
import { formatMoney } from "@/lib/money";
import { createTripAction } from "../actions";
import { CANNOT_COVER_FUEL } from "../profit";
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
              <dt className="text-muted-foreground">Delivery charge per unit</dt>
              <dd className="text-right tabular-nums">{formatMoney(planet.deliveryChargeCents)}</dd>
              <dt className="text-muted-foreground">Waiting orders</dt>
              <dd className="text-right tabular-nums">
                {planet.waitingOrders} ({planet.waitingUnits} units)
              </dd>
            </dl>
            <FuelHint planet={planet} />
            <ActionButton action={createTripAction} fields={{ planetId: planet.id }}>
              Start trip
            </ActionButton>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// How many units pay for the fuel, and whether the waiting orders are enough.
function FuelHint({ planet }: { planet: TripPlanet }) {
  const needed = planet.unitsToCoverFuel;
  if (needed === null || !fullShipCoversFuel(needed)) {
    return <p className="text-destructive">{CANNOT_COVER_FUEL}</p>;
  }
  const short = planet.waitingUnits < needed;
  return (
    <p className={short ? "text-destructive" : "text-muted-foreground"}>
      Needs {needed} {needed === 1 ? "unit" : "units"} to cover fuel
      {short && `. Only ${planet.waitingUnits} waiting, so a trip now would lose money`}
    </p>
  );
}
