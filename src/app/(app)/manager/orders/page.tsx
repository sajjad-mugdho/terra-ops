import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { OrderTable } from "@/features/orders/components/order-table";
import { listPlanetOrders } from "@/features/orders/service";
import { customerLabel, ORDER_STATUSES, parseOrderStatus } from "@/features/orders/status";
import { parsePage } from "@/lib/pagination";
import { parseSearch } from "@/lib/search";

export const metadata: Metadata = { title: "All orders" };

const PATH = "/manager/orders";

export default async function ManagerOrdersPage({ searchParams }: PageProps<"/manager/orders">) {
  await requirePageRole("manager");
  const params = await searchParams;
  const q = parseSearch(params.q);
  const status = parseOrderStatus(params.status);
  const orders = await listPlanetOrders({ page: parsePage(params.page), q, status });
  const filtered = q !== undefined || status !== undefined;

  return (
    <>
      <PageHeader title="All orders" description="Every order for your planet, in any status. Newest first. Waiting time counts from placed until you decide, then from accepted until a captain takes it." />
      {orders.total === 0 && !filtered ? (
        <EmptyState title="No orders yet" description="Orders for your planet appear here." />
      ) : (
        <>
          <ListFilters
            path={PATH}
            search={{ label: "Search by order code or customer", placeholder: "ORD-1001 or a name", value: q ?? "" }}
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
            <EmptyState title="No orders match" description="Try another order code, customer name or status.">
              <Button variant="outline" nativeButton={false} render={<Link href={PATH} />}>
                Clear
              </Button>
            </EmptyState>
          ) : (
            <>
              <OrderTable rows={orders.rows} basePath={PATH} now={new Date()} />
              <Pagination path={PATH} params={{ q, status }} {...orders} one="order" many="orders" />
            </>
          )}
        </>
      )}
    </>
  );
}
