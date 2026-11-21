import { ActionButton } from "@/components/action-button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orderCode } from "@/features/orders/status";
import { markStopAtSectorAction, markStopDeliveredAction } from "../actions";
import type { CaptainOrder } from "../service";
import type { Stop } from "../stops";
import { itemsText } from "./order-lines";

const STATE = {
  pending: { label: "On the ship", tone: "neutral" },
  at_sector: { label: "At sector", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
} as const;

export function StopCard({ tripId, stop }: { tripId: string; stop: Stop<CaptainOrder> }) {
  const fields = { tripId, divisionId: stop.divisionId };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {stop.sector} · {stop.division}
          </span>
          <StatusBadge {...STATE[stop.state]} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <ul className="flex flex-col gap-1">
          {stop.orders.map((order) => (
            <li key={order.id}>
              <span className="font-medium">{orderCode(order.number)}</span> · {itemsText(order)}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">{stop.units} units for this stop</p>
        {stop.state === "pending" && (
          <ActionButton action={markStopAtSectorAction} fields={fields}>
            Delivered to sector
          </ActionButton>
        )}
        {stop.state === "at_sector" && (
          <ActionButton action={markStopDeliveredAction} fields={fields}>
            Delivered to division
          </ActionButton>
        )}
      </CardContent>
    </Card>
  );
}
