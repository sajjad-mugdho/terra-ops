import { PackageCheck, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/features/auth/guards";
import { OrderTable } from "@/features/orders/components/order-table";
import { ProgressSteps } from "@/features/orders/components/progress-steps";
import { getMyOrderSummary, listMyOrders } from "@/features/orders/service";
import { customerLabel, isFinalStatus, orderCode, orderTone } from "@/features/orders/status";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

const RECENT = 5;

export default async function CustomerHomePage() {
  const customer = await requirePageRole("customer");
  const [summary, orders] = await Promise.all([getMyOrderSummary(), listMyOrders()]);
  // The newest order that is still moving.
  const current = orders.rows.find((order) => !isFinalStatus(order.status));

  return (
    <>
      <PageHeader title={`Welcome, ${customer.name}`} description="Your orders at a glance.">
        <Button nativeButton={false} render={<Link href="/customer/orders/new" />}>
          New order
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="On the way" icon={Truck} value={summary.active} hint="Placed, not delivered yet" />
          <StatCard label="Delivered" icon={PackageCheck} value={summary.delivered} hint="Arrived at your division" />
          <StatCard
            label="Total paid"
            icon={Wallet}
            value={formatMoney(summary.totalPaidCents)}
            hint="Refunded orders are not counted"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{current ? `${orderCode(current.number)} is on its way` : "Nothing on the way"}</CardTitle>
            <CardDescription>
              {current
                ? `${current.destination.planet} · ${current.destination.sector} · ${current.destination.division}`
                : "Order supplies from Earth to any division."}
            </CardDescription>
            <CardAction>
              {current ? (
                <StatusBadge label={customerLabel(current.status)} tone={orderTone(current.status)} />
              ) : (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/customer/orders/new" />}>
                  Place an order
                </Button>
              )}
            </CardAction>
          </CardHeader>
          {current && (
            <CardContent className="flex flex-col gap-4">
              <ProgressSteps status={current.status} />
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/customer/orders/${current.id}`} />}
                >
                  Track this order
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {orders.total > 0 && (
          <section aria-labelledby="recent" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent" className="text-lg font-semibold">
                Recent orders
              </h2>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/customer/orders" />}>
                All {orders.total} orders
              </Button>
            </div>
            <OrderTable rows={orders.rows.slice(0, RECENT)} basePath="/customer/orders" />
          </section>
        )}
      </div>
    </>
  );
}
