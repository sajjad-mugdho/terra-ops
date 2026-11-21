import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { OrderTable } from "@/features/orders/components/order-table";
import { listMyOrders } from "@/features/orders/service";

export const metadata: Metadata = { title: "My orders" };

export default async function CustomerOrdersPage() {
  await requirePageRole("customer");
  const orders = await listMyOrders();

  return (
    <>
      <PageHeader title="My orders" description="Everything you ordered, and where it is now.">
        <Button nativeButton={false} render={<Link href="/customer/orders/new" />}>
          New order
        </Button>
      </PageHeader>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" description="Order supplies from Earth to any division.">
          <Button nativeButton={false} render={<Link href="/customer/orders/new" />}>
            Place your first order
          </Button>
        </EmptyState>
      ) : (
        <OrderTable rows={orders} basePath="/customer/orders" />
      )}
    </>
  );
}
