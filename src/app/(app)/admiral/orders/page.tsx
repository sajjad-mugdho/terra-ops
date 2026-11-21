import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SelectFilters } from "@/components/select-filters";
import { requirePageRole } from "@/features/auth/guards";
import { OrderTable } from "@/features/orders/components/order-table";
import { listAllOrders } from "@/features/orders/service";
import { customerLabel, ORDER_STATUSES, parseOrderStatus } from "@/features/orders/status";
import { listPlanetsForAdmiral } from "@/features/settings/service";

export const metadata: Metadata = { title: "Orders" };

export default async function AdmiralOrdersPage({ searchParams }: PageProps<"/admiral/orders">) {
  await requirePageRole("admiral");
  const params = await searchParams;
  const status = parseOrderStatus(params.status);
  const planets = await listPlanetsForAdmiral();
  // An unknown planet in the URL is ignored, like an unknown status.
  const planetId = planets.find((planet) => planet.id === params.planet)?.id;
  const orders = await listAllOrders({ status, planetId });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order of every planet and customer. Read-only. Newest first."
      />
      <SelectFilters
        path="/admiral/orders"
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
        ]}
      />
      {orders.length === 0 ? (
        <EmptyState title="No orders found" description="No order matches these filters." />
      ) : (
        <OrderTable rows={orders} basePath="/admiral/orders" />
      )}
    </>
  );
}
