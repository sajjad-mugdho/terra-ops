import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdmiralHomePage() {
  await requirePageRole("admiral");
  return (
    <>
      <PageHeader title="Dashboard" description="Profit by planet and product will appear here." />
      <EmptyState title="No sales yet" description="Delivered orders will show up here as revenue, cost and profit." />
    </>
  );
}
