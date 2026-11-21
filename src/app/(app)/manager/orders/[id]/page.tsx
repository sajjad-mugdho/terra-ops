import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { OrderDetailView } from "@/features/orders/components/order-detail";
import { getPlanetOrder } from "@/features/orders/service";
import { orderCode } from "@/features/orders/status";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Order" };

export default async function ManagerOrderPage({ params }: PageProps<"/manager/orders/[id]">) {
  await requirePageRole("manager");
  const { id } = await params;
  // An order of another planet looks exactly like an order that does not exist.
  const order = await getPlanetOrder(id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!order) notFound();

  return (
    <>
      <PageHeader title={orderCode(order.number)} description="Order detail and timeline, in Earth time (UTC).">
        <Button variant="outline" nativeButton={false} render={<Link href="/manager/orders" />}>
          All orders
        </Button>
      </PageHeader>
      <OrderDetailView order={order} />
    </>
  );
}
