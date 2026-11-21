import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";

export const metadata: Metadata = { title: "My trip" };

export default async function CaptainHomePage() {
  await requirePageRole("captain");
  return (
    <>
      <PageHeader title="My trip" description="Build a trip, fly it and deliver its stops." />
      <EmptyState title="No open trip" description="Start a trip to pick up accepted orders." />
    </>
  );
}
