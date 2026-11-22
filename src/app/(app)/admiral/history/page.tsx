import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { requirePageRole } from "@/features/auth/guards";
import { HistoryTable } from "@/features/settings/components/history-table";
import { ENTITY_LABEL, parseEntity, SETTING_ENTITIES } from "@/features/settings/history";
import { listSettingsChanges } from "@/features/settings/service";
import { parsePage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Settings history" };

const PATH = "/admiral/history";

export default async function AdmiralHistoryPage({ searchParams }: PageProps<"/admiral/history">) {
  await requirePageRole("admiral");
  const params = await searchParams;
  const entity = parseEntity(params.entity);
  const changes = await listSettingsChanges({ page: parsePage(params.page), entity });

  return (
    <>
      <PageHeader
        title="Settings history"
        description="Every change of a price, making cost, delivery charge or fuel cost. Newest first, in UTC. Read-only: a change is never edited or removed."
      />
      <ListFilters
        path={PATH}
        selects={[
          {
            name: "entity",
            label: "Show",
            value: entity ?? "",
            emptyLabel: "All changes",
            options: SETTING_ENTITIES.map((each) => ({ value: each, label: ENTITY_LABEL[each] })),
          },
        ]}
      />
      {changes.total === 0 ? (
        <EmptyState
          title="No changes yet"
          description={
            entity
              ? "Nothing of this kind was changed yet."
              : "A change of a product or planet setting appears here."
          }
        >
          {entity && (
            <Button variant="outline" nativeButton={false} render={<Link href={PATH} />}>
              Clear
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <HistoryTable rows={changes.rows} />
          <Pagination path={PATH} params={{ entity }} {...changes} one="change" many="changes" />
        </>
      )}
    </>
  );
}
