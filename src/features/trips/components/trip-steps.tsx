import { ActionButton } from "@/components/action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, formatUtc } from "@/lib/dates";
import { markLandedAction, markLiftedOffAction } from "../actions";
import type { TripDetail } from "../service";
import { OrderLines } from "./order-lines";

// LOADED and LIFTED_OFF: the trip is locked and has exactly one next step.
export function TripSteps({ trip }: { trip: TripDetail }) {
  const loaded = trip.status === "LOADED";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Units on board</dt>
            <dd>{trip.totalUnits}</dd>
            {trip.loadedAt && (
              <>
                <dt className="text-muted-foreground">Loaded</dt>
                <dd>{formatUtc(trip.loadedAt)}</dd>
              </>
            )}
            {trip.liftedOffAt && (
              <>
                <dt className="text-muted-foreground">Lifted off</dt>
                <dd>{formatUtc(trip.liftedOffAt)}</dd>
                <dt className="text-muted-foreground">Estimated arrival</dt>
                <dd>{formatUtc(addDays(trip.liftedOffAt, trip.planet.daysFromEarth))}</dd>
              </>
            )}
          </dl>
          {loaded ? (
            <ActionButton action={markLiftedOffAction} fields={{ tripId: trip.id }}>
              Mark as lifted off
            </ActionButton>
          ) : (
            <ActionButton action={markLandedAction} fields={{ tripId: trip.id }}>
              Mark as landed
            </ActionButton>
          )}
          <p className="text-xs text-muted-foreground">
            {loaded
              ? "The trip is locked. Orders can no longer be added or removed."
              : "Mark the landing whenever the ship arrives. The arrival time is only an estimate."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders on board</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderLines orders={trip.orders} />
        </CardContent>
      </Card>
    </div>
  );
}
