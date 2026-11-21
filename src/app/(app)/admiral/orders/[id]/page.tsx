import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { OrderDetailView } from "@/features/orders/components/order-detail";
import { OrderProfitCard } from "@/features/orders/components/order-profit-card";
import { getAnyOrder } from "@/features/orders/service";
import { orderCode } from "@/features/orders/status";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Order" };

export default async function AdmiralOrderPage({ params }: PageProps<"/admiral/orders/[id]">) {
  await requirePageRole("admiral");
  const { id } = await params;
  const order = await getAnyOrder(id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  });
  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={orderCode(order.number)}
        description="Read-only. The timeline shows who did each step, in Earth time (UTC)."
      >
        <Button variant="outline" nativeButton={false} render={<Link href="/admiral/orders" />}>
          All orders
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-6">
        <OrderDetailView order={order} />
        <OrderProfitCard order={order} />
      </div>
    </>
  );
}
