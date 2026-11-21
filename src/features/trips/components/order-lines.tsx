import type { ReactNode } from "react";
import { orderCode } from "@/features/orders/status";
import { formatMoney } from "@/lib/money";
import type { AvailableOrder, CaptainOrder } from "../service";

type Order = CaptainOrder | AvailableOrder;

export const itemsText = (order: Order) =>
  order.items.map((item) => `${item.units} ${item.product}`).join(", ");

// A captain sees products, units, address and delivery charges. Nothing else.
export function OrderLines({ orders, action }: { orders: Order[]; action?: (order: Order) => ReactNode }) {
  return (
    <ul className="divide-y">
      {orders.map((order) => (
        <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
          <div>
            <p className="font-medium">
              {orderCode(order.number)} · {itemsText(order)}
            </p>
            <p className="text-muted-foreground">
              {order.sector} · {order.division} · {order.totalUnits} units · Delivery charges{" "}
              {formatMoney(order.deliveryChargesCents)}
            </p>
          </div>
          {action?.(order)}
        </li>
      ))}
    </ul>
  );
}
