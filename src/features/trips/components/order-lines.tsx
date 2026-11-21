import type { ReactNode } from "react";
import { WaitingTime } from "@/features/orders/components/waiting-time";
import { orderCode } from "@/features/orders/status";
import { waitingOf } from "@/features/orders/waiting";
import { formatMoney } from "@/lib/money";
import type { AvailableOrder, CaptainOrder } from "../service";

type Order = CaptainOrder | AvailableOrder;

export const itemsText = (order: Order) =>
  order.items.map((item) => `${item.units} ${item.product}`).join(", ");

// A captain sees products, units, address and delivery charges. Nothing else.
type Props = { orders: Order[]; action?: (order: Order) => ReactNode; now?: Date };

// With now, an order that still waits shows what it adds to the trip and how long it has waited.
export function OrderLines({ orders, action, now }: Props) {
  return (
    <ul className="divide-y">
      {orders.map((order) => {
        const waiting = now && "waitingSince" in order ? waitingOf(order.waitingSince, now) : null;
        return (
          <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-medium">
                {orderCode(order.number)} · {itemsText(order)}
                {waiting && (
                  <span className="ml-2 font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                    +{formatMoney(order.deliveryChargesCents)}
                  </span>
                )}
              </p>
              <p className="text-muted-foreground">
                {order.sector} · {order.division} · {order.totalUnits} units · Delivery charges{" "}
                {formatMoney(order.deliveryChargesCents)}
              </p>
              {waiting && <WaitingTime waiting={waiting} className="text-xs text-muted-foreground" />}
            </div>
            {action?.(order)}
          </li>
        );
      })}
    </ul>
  );
}
