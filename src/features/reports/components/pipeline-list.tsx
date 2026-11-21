import { StatusBadge } from "@/components/status-badge";
import { customerLabel, orderTone } from "@/features/orders/status";
import type { PipelineRow } from "../service";

// Orders right now, in every status. The date range does not apply here.
export function PipelineList({ rows }: { rows: PipelineRow[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
      {rows.map((row) => (
        <li key={row.status} className="flex flex-col items-start gap-1 rounded-lg border p-3">
          <span className="text-2xl font-semibold tabular-nums">{row.count}</span>
          <StatusBadge label={customerLabel(row.status)} tone={orderTone(row.status)} />
        </li>
      ))}
    </ul>
  );
}
