import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { OrderTable } from "@/features/orders/components/order-table";
import { listAllOrders } from "@/features/orders/service";
import { customerLabel, ORDER_STATUSES, parseOrderStatus } from "@/features/orders/status";
import { OVERDUE_DAYS, parseOrderSort } from "@/features/orders/waiting";
import { listPlanetsForAdmiral } from "@/features/settings/service";
import { parsePage } from "@/lib/pagination";
import { parseSearch } from "@/lib/search";

export const metadata: Metadata = { title: "Orders" };

const PATH = "/admiral/orders";

export default async function AdmiralOrdersPage({ searchParams }: PageProps<"/admiral/orders">) {
  await requirePageRole("admiral");
  const params = await searchParams;
  const status = parseOrderStatus(params.status);
  const planets = await listPlanetsForAdmiral();
  // An unknown planet in the URL is ignored, like an unknown status.
  const planetId = planets.find((planet) => planet.id === params.planet)?.id;
  const overdue = params.waiting === "overdue";
  const sort = parseOrderSort(params.sort);
  const q = parseSearch(params.q);
  const filtered = q !== undefined || status !== undefined || planetId !== undefined || overdue;
  const orders = await listAllOrders({ page: parsePage(params.page), q, status, planetId, overdue, sort });

  return (
    <>
      <PageHeader
        title="Orders"
        description={`Every order of every planet and customer. Read-only. An order is overdue after waiting more than ${OVERDUE_DAYS} days for a manager or a captain.`}
      />
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
          {
            name: "planet",
            label: "Planet",
            value: planetId ?? "",
            options: planets.map((planet) => ({ value: planet.id, label: planet.name })),
          },
          {
            name: "waiting",
            label: "Waiting",
            value: overdue ? "overdue" : "",
            options: [{ value: "overdue", label: `Longer than ${OVERDUE_DAYS} days` }],
          },
          {
            name: "sort",
            label: "Sort",
            value: sort === "waiting" ? "waiting" : "",
            emptyLabel: "Newest first",
            options: [{ value: "waiting", label: "Longest waiting first" }],
          },
        ]}
      />
      {orders.total === 0 && !filtered ? (
        <EmptyState title="No orders yet" description="Orders of every planet appear here." />
      ) : orders.total === 0 ? (
        <EmptyState title="No orders match" description="No order matches this search and these filters.">
          <Button variant="outline" nativeButton={false} render={<Link href={PATH} />}>
            Clear
          </Button>
        </EmptyState>
      ) : (
        <>
          <OrderTable rows={orders.rows} basePath={PATH} now={new Date()} />
          <Pagination
            path={PATH}
            params={{
              q,
              status,
              planet: planetId,
              waiting: overdue ? "overdue" : undefined,
              sort: sort === "waiting" ? "waiting" : undefined,
            }}
            {...orders}
            one="order"
            many="orders"
          />
        </>
      )}
    </>
  );
}
