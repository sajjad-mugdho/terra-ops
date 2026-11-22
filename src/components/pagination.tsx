import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, pageHref } from "@/lib/pagination";

type Props = {
  path: string;
  // The filters of the list, so they stay in every page link.
  params?: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
  one: string;
  many: string;
};

// cn settles the border classes of the base and the variant.
const LINK = cn(buttonVariants({ variant: "outline", size: "sm" }));

// A real link, so back, forward and "open in new tab" work. No href: the end of the list.
function PageLink({ href, rel, children }: { href: string | null; rel: "prev" | "next"; children: string }) {
  if (!href) {
    return (
      <span aria-disabled="true" className={cn(LINK, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} className={LINK}>
      {children}
    </Link>
  );
}

// The total is always shown. The page links appear only when there is more than one page.
export function Pagination({ path, params = {}, page, pageCount, total, one, many }: Props) {
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground tabular-nums">
        {pageCount > 1 ? `Showing ${first} to ${last} of ${total} ${many}` : `${total} ${total === 1 ? one : many}`}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <PageLink href={page > 1 ? pageHref(path, params, page - 1) : null} rel="prev">
            Previous
          </PageLink>
          <span aria-current="page" className="tabular-nums">
            Page {page} of {pageCount}
          </span>
          <PageLink href={page < pageCount ? pageHref(path, params, page + 1) : null} rel="next">
            Next
          </PageLink>
        </nav>
      )}
    </div>
  );
}
