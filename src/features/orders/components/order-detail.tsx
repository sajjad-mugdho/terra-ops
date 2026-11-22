import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tripCode } from "@/features/trips/status";
import { formatUtc } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { etaText, waitingText } from "../eta";
import type { OrderDetail } from "../service";
import { customerLabel, orderTone } from "../status";
import { OrderTimeline, type ShownEvent } from "./order-timeline";
import { ProgressSteps } from "./progress-steps";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Shown = Omit<OrderDetail, "timeline"> & { timeline: ShownEvent[]; customerName?: string };

export function OrderDetailView({ order }: { order: Shown }) {
  const { destination, trip } = order;
  const eta = etaText({
    status: order.status,
    planet: destination.planet,
    daysFromEarth: order.daysFromEarth,
    liftedOffAt: trip?.liftedOffAt ?? null,
    deliveredAt: order.deliveredAt,
  });
  const waiting = waitingText(order.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={customerLabel(order.status)} tone={orderTone(order.status)} />
        <StatusBadge
          label={order.paymentStatus === "PAID" ? "Paid" : "Refunded"}
          tone={order.paymentStatus === "PAID" ? "success" : "danger"}
        />
        <span className="text-sm text-muted-foreground">
          {destination.planet} · {destination.sector} · {destination.division}
          {order.customerName && ` · ${order.customerName}`}
        </span>
      </div>

      {order.status === "REJECTED" ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">This order was rejected</p>
          <p className="mt-1 whitespace-pre-wrap">Reason: {order.rejectReason}</p>
          <p className="mt-1 text-muted-foreground">
            {formatMoney(order.totalCents)} was refunded.
          </p>
        </div>
      ) : (
        <ProgressSteps status={order.status} />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          {order.status !== "REJECTED" && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                {eta && <p className="font-medium">{eta}</p>}
                {waiting && <p className="text-muted-foreground">{waiting}</p>}
                {trip && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <dt className="text-muted-foreground">Ship</dt>
                    <dd>{tripCode(trip.number)}</dd>
                    <dt className="text-muted-foreground">Lift-off</dt>
                    <dd>{trip.liftedOffAt ? formatUtc(trip.liftedOffAt) : "Not yet"}</dd>
                    {trip.landedAt && (
                      <>
                        <dt className="text-muted-foreground">Landed</dt>
                        <dd>{formatUtc(trip.landedAt)}</dd>
                      </>
                    )}
                  </dl>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Delivery</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.productName} className="tabular-nums">
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right">{item.units}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.unitPriceCents)}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.unitDeliveryChargeCents)}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.lineTotalCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <dl className="mt-3 ml-auto flex max-w-xs flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Product amount</dt>
                  <dd className="tabular-nums">{formatMoney(order.productAmountCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery charges</dt>
                  <dd className="tabular-nums">{formatMoney(order.deliveryChargesCents)}</dd>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-medium">
                  <dt>Total ({order.totalUnits} units)</dt>
                  <dd className="tabular-nums">{formatMoney(order.totalCents)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline events={order.timeline} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
