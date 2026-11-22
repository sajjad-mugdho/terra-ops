import Link from "next/link";
import { WaitingTime } from "@/features/orders/components/waiting-time";
import { customerLabel } from "@/features/orders/status";
import { waitingOf } from "@/features/orders/waiting";
import type { PipelineRow } from "../service";

// Orders right now, one bar per status. Each row opens the orders list with that status.
export function PipelineList({ rows, now }: { rows: PipelineRow[]; now: Date }) {
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    <ul className="grid gap-x-10 gap-y-3 md:grid-cols-2">
      {rows.map((row) => {
        const waiting = waitingOf(row.oldestWaitingSince, now);
        return (
          <li key={row.status} className="grid grid-cols-[minmax(0,11rem)_1fr_2rem] items-center gap-x-3 text-sm">
            <Link href={`/admiral/orders?status=${row.status}`} className="truncate underline-offset-4 hover:underline">
              {customerLabel(row.status)}
            </Link>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-chart-1" style={{ width: `${(row.count / most) * 100}%` }} />
            </div>
            <span className="text-right font-medium tabular-nums">{row.count}</span>
            {waiting && (
              <span className="col-span-3 text-xs text-muted-foreground">
                Oldest: <WaitingTime waiting={waiting} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
