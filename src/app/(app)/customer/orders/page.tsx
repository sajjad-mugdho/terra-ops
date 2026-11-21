import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { OrderTable } from "@/features/orders/components/order-table";
import { listMyOrders } from "@/features/orders/service";
import { customerLabel, ORDER_STATUSES, parseOrderStatus } from "@/features/orders/status";
import { parsePage } from "@/lib/pagination";
import { parseSearch } from "@/lib/search";

export const metadata: Metadata = { title: "My orders" };

const PATH = "/customer/orders";

export default async function CustomerOrdersPage({ searchParams }: PageProps<"/customer/orders">) {
  await requirePageRole("customer");
  const params = await searchParams;
  const q = parseSearch(params.q);
  const status = parseOrderStatus(params.status);
  const orders = await listMyOrders({ page: parsePage(params.page), q, status });
  const filtered = q !== undefined || status !== undefined;

  return (
    <>
      <PageHeader title="My orders" description="Everything you ordered, and where it is now. Newest first.">
        <Button nativeButton={false} render={<Link href="/customer/orders/new" />}>
          New order
        </Button>
      </PageHeader>
      {orders.total === 0 && !filtered ? (
        <EmptyState title="No orders yet" description="Order supplies from Earth to any division.">
          <Button nativeButton={false} render={<Link href="/customer/orders/new" />}>
            Place your first order
          </Button>
        </EmptyState>
      ) : (
        <>
          <ListFilters
            path={PATH}
            search={{ label: "Search by order code", placeholder: "ORD-1001", value: q ?? "" }}
            selects={[
              {
                name: "status",
                label: "Status",
                value: status ?? "",
                options: ORDER_STATUSES.map((each) => ({ value: each, label: customerLabel(each) })),
              },
            ]}
          />
          {orders.total === 0 ? (
            <EmptyState title="No orders match" description="Try another order code or status.">
              <Button variant="outline" nativeButton={false} render={<Link href={PATH} />}>
                Clear
              </Button>
            </EmptyState>
          ) : (
            <>
              <OrderTable rows={orders.rows} basePath={PATH} />
              <Pagination path={PATH} params={{ q, status }} {...orders} one="order" many="orders" />
            </>
          )}
        </>
      )}
    </>
  );
}
