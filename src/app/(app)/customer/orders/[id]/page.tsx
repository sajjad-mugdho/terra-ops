import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { OrderDetailView } from "@/features/orders/components/order-detail";
import { getMyOrder } from "@/features/orders/service";
import { isFinalStatus, orderCode } from "@/features/orders/status";
import { formatUtcTime } from "@/lib/dates";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Order tracking" };

export default async function OrderTrackingPage({ params }: PageProps<"/customer/orders/[id]">) {
  await requirePageRole("customer");
  const { id } = await params;
  // Someone else's order looks exactly like an order that does not exist.
  const order = await getMyOrder(id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!order) notFound();

  return (
    <>
      <PageHeader title={orderCode(order.number)} description="Every step of your order, in Earth time (UTC).">
        <Button variant="outline" nativeButton={false} render={<Link href="/customer/orders" />}>
          All my orders
        </Button>
      </PageHeader>
      {/* A delivered or rejected order never changes again, so it stops asking. */}
      {!isFinalStatus(order.status) && <AutoRefresh updatedAt={formatUtcTime(new Date())} />}
      <OrderDetailView order={order} />
    </>
  );
}
