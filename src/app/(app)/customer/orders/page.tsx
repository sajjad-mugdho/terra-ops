import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";

export const metadata: Metadata = { title: "My orders" };

export default async function CustomerHomePage() {
  await requirePageRole("customer");
  return (
    <>
      <PageHeader title="My orders" description="Everything you ordered, and where it is now." />
      <EmptyState title="No orders yet" description="Your orders will appear here once you place one." />
    </>
  );
}
