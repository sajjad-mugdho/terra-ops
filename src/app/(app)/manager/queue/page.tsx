import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";
import { QueueCard } from "@/features/orders/components/queue-card";
import { listQueue } from "@/features/orders/service";

export const metadata: Metadata = { title: "Order queue" };

export default async function ManagerQueuePage() {
  await requirePageRole("manager");
  const queue = await listQueue();

  return (
    <>
      <PageHeader title="Order queue" description="New orders for your planet wait here for a decision. Oldest first." />
      {queue.length === 0 ? (
        <EmptyState title="No orders waiting" description="When a customer orders to your planet, it appears here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {queue.map((order) => (
            <QueueCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </>
  );
}
