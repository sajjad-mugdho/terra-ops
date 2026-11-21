import { ActionButton } from "@/components/action-button";
import { EmptyState } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import {
  addOrderToTripAction,
  cancelTripAction,
  markLoadedAction,
  removeOrderFromTripAction,
} from "../actions";
import type { AvailableOrder, OpenTrip } from "../service";
import { TRIP_CAPACITY } from "../status";
import { CapacityBar } from "./capacity-bar";
import { OrderLines } from "./order-lines";
import { LossWarning, ProfitSummary } from "./profit-summary";

type Props = { trip: OpenTrip; available: AvailableOrder[]; now: Date };

export function TripBuilder({ trip, available, now }: Props) {
  const free = TRIP_CAPACITY - trip.totalUnits;
  const empty = trip.orders.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <CapacityBar units={trip.totalUnits} />
          <ProfitSummary trip={trip} />
          <p className="text-sm text-muted-foreground">
            Fuel cost for this trip: {formatMoney(trip.fuelCostCents)}. It stays the same even if
            the planet&apos;s fuel cost changes.
          </p>
          {!empty && <LossWarning profitCents={trip.expectedProfitCents} />}
          <div className="flex flex-wrap items-start gap-2">
            <ActionButton action={markLoadedAction} fields={{ tripId: trip.id }} disabled={empty}>
              Mark as loaded
            </ActionButton>
            <ActionButton action={cancelTripAction} fields={{ tripId: trip.id }} variant="outline">
              Cancel trip
            </ActionButton>
          </div>
          <p className="text-xs text-muted-foreground">
            {empty
              ? "Add at least one order before loading."
              : trip.expectedProfitCents < 0
                ? "You can still load this trip. After loading, orders can no longer be added or removed."
                : "After loading, orders can no longer be added or removed."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders in this trip</CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <p className="text-sm text-muted-foreground">No orders in this trip yet.</p>
          ) : (
            <OrderLines
              orders={trip.orders}
              action={(order) => (
                <ActionButton
                  action={removeOrderFromTripAction}
                  fields={{ tripId: trip.id, orderId: order.id }}
                  variant="outline"
                  size="sm"
                >
                  Remove
                </ActionButton>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available orders for {trip.planet.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <EmptyState
              title="No orders waiting for this planet"
              description="Accepted orders appear here once the planet manager approves them."
            />
          ) : (
            <OrderLines
              orders={available}
              now={now}
              action={(order) => {
                const fits = "fits" in order && order.fits;
                return (
                  <div className="flex flex-col items-end gap-1">
                    <ActionButton
                      action={addOrderToTripAction}
                      fields={{ tripId: trip.id, orderId: order.id }}
                      size="sm"
                      disabled={!fits}
                    >
                      Add
                    </ActionButton>
                    {!fits && (
                      <p className="text-xs text-muted-foreground">
                        Needs {order.totalUnits} units, {free} left
                      </p>
                    )}
                  </div>
                );
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
