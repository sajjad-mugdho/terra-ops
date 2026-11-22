import { Inbox, PackageCheck, Receipt, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { MoneyBarChart } from "@/components/charts/money-bar-chart";
import { MoneyTrendChart } from "@/components/charts/money-trend-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/features/auth/guards";
import { WaitingTime } from "@/features/orders/components/waiting-time";
import { listQueue } from "@/features/orders/service";
import { orderCode } from "@/features/orders/status";
import { waitingOf } from "@/features/orders/waiting";
import { DEFAULT_RANGE_DAYS, defaultRange } from "@/features/reports/range";
import { bucketLabel } from "@/features/reports/series";
import { getPlanetInProgress, getPlanetPurchases, getPlanetSpendSeries } from "@/features/reports/service";
import { formatUtcTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

const NEXT_UP = 5;

export default async function ManagerHomePage() {
  const manager = await requirePageRole("manager");
  const now = new Date();
  const range = defaultRange(now);
  // The planet comes from the session. Nothing in the URL can change it.
  const [queue, delivered, inProgress, series] = await Promise.all([
    listQueue(),
    getPlanetPurchases(range),
    getPlanetInProgress(),
    getPlanetSpendSeries(range),
  ]);
  const waiting = queue.map((order) => ({ order, waiting: waitingOf(order.waitingSince, now) }));
  const overdue = waiting.filter((each) => each.waiting?.overdue).length;
  const oldest = waiting[0]?.waiting;

  return (
    <>
      <PageHeader
        title={`${manager.planetName ?? "Your planet"} dashboard`}
        description={`Orders waiting for you, and what the planet bought in the last ${DEFAULT_RANGE_DAYS} days.`}
      />
      <AutoRefresh updatedAt={formatUtcTime(now)} />

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Waiting for your decision"
            icon={Inbox}
            value={queue.length}
            danger={overdue > 0}
            hint={oldest ? <>Oldest: <WaitingTime waiting={oldest} /></> : "Nothing is waiting"}
          />
          <StatCard
            label="On the way"
            icon={Truck}
            value={`${inProgress.total.units} units`}
            hint="Accepted, not delivered yet"
          />
          <StatCard
            label="Delivered"
            icon={PackageCheck}
            value={`${delivered.total.units} units`}
            hint={`Last ${DEFAULT_RANGE_DAYS} days`}
          />
          <StatCard
            label="Paid"
            icon={Receipt}
            value={formatMoney(delivered.total.totalPaidCents)}
            hint="Products and delivery charges of delivered orders"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Paid per day</CardTitle>
              <CardDescription>
                Delivered orders from {range.from} to {range.to}, by delivery date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MoneyTrendChart
                points={series.points.map((point) => ({
                  label: bucketLabel(point.date, series.unit),
                  totalPaidCents: point.totalPaidCents,
                }))}
                series={[{ key: "totalPaidCents", label: "Paid", color: "var(--chart-1)" }]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Paid by product</CardTitle>
              <CardDescription>The same {DEFAULT_RANGE_DAYS} days.</CardDescription>
            </CardHeader>
            <CardContent>
              <MoneyBarChart
                ranked
                rows={delivered.rows.map((row) => ({ name: row.product, totalPaidCents: row.totalPaidCents }))}
                series={[{ key: "totalPaidCents", label: "Paid", color: "var(--chart-1)" }]}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next in the queue</CardTitle>
            <CardDescription>
              {queue.length === 0
                ? "When a customer orders to your planet, it appears here."
                : `The ${Math.min(NEXT_UP, queue.length)} oldest of ${queue.length}. Accept or reject them in the queue.`}
            </CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/manager/queue" />}>
                Open the queue
              </Button>
            </CardAction>
          </CardHeader>
          {queue.length > 0 && (
            <CardContent>
              <ul className="divide-y text-sm">
                {waiting.slice(0, NEXT_UP).map(({ order, waiting: wait }) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium">{orderCode(order.number)}</p>
                      <p className="truncate text-muted-foreground">
                        {order.customerName} · {order.sector} · {order.division}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {wait && <WaitingTime waiting={wait} />}
                      <span className="tabular-nums">
                        {order.totalUnits} units · {formatMoney(order.totalCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  );
}
