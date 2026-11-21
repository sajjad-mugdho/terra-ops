import type { ReactNode } from "react";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { TripDetail } from "../service";
import { isOpenTrip, tripLabel, tripTone } from "../status";
import { OrderLines } from "./order-lines";

const STOP_STATE = {
  pending: { label: "On the ship", tone: "neutral" },
  at_sector: { label: "At sector", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
} as const;

type Props = {
  trip: TripDetail;
  money: { earningsCents: number; profitCents: number };
  captainName?: string;
};

// One trip, read-only: money, dates, orders and stops. No step buttons.
export function TripOverview({ trip, money, captainName }: Props) {
  const cancelled = trip.status === "CANCELLED";
  const open = isOpenTrip(trip.status);
  const facts: [string, ReactNode][] = [
    ...(captainName ? ([["Captain", captainName]] satisfies [string, ReactNode][]) : []),
    ["Planet", `${trip.planet.name} · ${trip.planet.daysFromEarth} days from Earth`],
    ["Units", trip.totalUnits],
    [open ? "Expected earnings" : "Earnings", <Money key="earnings" cents={money.earningsCents} />],
    ["Fuel cost", <Money key="fuel" cents={cancelled ? 0 : trip.fuelCostCents} />],
    [open ? "Expected profit" : "Profit", <Money key="profit" cents={money.profitCents} className="font-medium" />],
    ["Created", formatUtc(trip.createdAt)],
    ...([
      ["Loaded", trip.loadedAt],
      ["Lifted off", trip.liftedOffAt],
      ["Landed", trip.landedAt],
      ["Completed", trip.completedAt],
    ] as const).flatMap(([label, at]): [string, ReactNode][] => (at ? [[label, formatUtc(at)]] : [])),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={tripLabel(trip.status)} tone={tripTone(trip.status)} />
        <span className="text-sm text-muted-foreground">
          Earnings are the delivery charges of the trip&apos;s orders. Profit is earnings minus fuel.
        </span>
      </div>

      {money.profitCents < 0 && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {open ? "This trip will lose" : "This trip lost"} {formatMoney(-money.profitCents)}: earnings{" "}
          {formatMoney(money.earningsCents)}, fuel {formatMoney(trip.fuelCostCents)}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {trip.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {cancelled ? "This trip was cancelled. Its orders went back to the waiting list." : "No orders on this trip yet."}
                </p>
              ) : (
                <OrderLines orders={trip.orders} />
              )}
            </CardContent>
          </Card>

          {trip.stops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stops</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {trip.stops.map((stop) => (
                    <li key={stop.divisionId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>
                        {stop.sector} · {stop.division} · {stop.units} units
                      </span>
                      <StatusBadge {...STOP_STATE[stop.state]} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
