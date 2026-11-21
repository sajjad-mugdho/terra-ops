import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";
import { QueueCard } from "@/features/orders/components/queue-card";
import { listQueue } from "@/features/orders/service";
import { OVERDUE_DAYS, waitingOf } from "@/features/orders/waiting";
import { formatUtcTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Order queue" };

export default async function ManagerQueuePage() {
  await requirePageRole("manager");
  const now = new Date();
  const queue = (await listQueue()).map((order) => ({
    order,
    waiting: waitingOf(order.waitingSince, now),
  }));
  const overdue = queue.filter((each) => each.waiting?.overdue).length;

  return (
    <>
      <PageHeader title="Order queue" description="New orders for your planet wait here for a decision. Oldest first." />
      <AutoRefresh updatedAt={formatUtcTime(now)} />
      {queue.length === 0 ? (
        <EmptyState title="No orders waiting" description="When a customer orders to your planet, it appears here." />
      ) : (
        <>
          {overdue > 0 && (
            <p role="status" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {overdue} {overdue === 1 ? "order has" : "orders have"} waited more than {OVERDUE_DAYS} days for
              your decision. Accept or reject {overdue === 1 ? "it" : "them"} first.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {queue.map(({ order, waiting }) => (
              <QueueCard key={order.id} order={order} waiting={waiting} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
