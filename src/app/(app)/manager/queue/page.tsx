import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";

export const metadata: Metadata = { title: "Order queue" };

export default async function ManagerHomePage() {
  await requirePageRole("manager");
  return (
    <>
      <PageHeader title="Order queue" description="New orders for your planet wait here for a decision." />
      <EmptyState title="No orders waiting" description="When a customer orders to your planet, it appears here." />
    </>
  );
}
