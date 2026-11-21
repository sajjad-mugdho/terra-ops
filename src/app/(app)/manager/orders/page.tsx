import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";
import { OrderTable } from "@/features/orders/components/order-table";
import { listPlanetOrders } from "@/features/orders/service";

export const metadata: Metadata = { title: "All orders" };

export default async function ManagerOrdersPage() {
  await requirePageRole("manager");
  const orders = await listPlanetOrders();

  return (
    <>
      <PageHeader title="All orders" description="Every order for your planet, in any status. Newest first. Waiting time counts from placed until you decide, then from accepted until a captain takes it." />
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Orders for your planet appear here." />
      ) : (
        <OrderTable rows={orders} basePath="/manager/orders" now={new Date()} />
      )}
    </>
  );
}
