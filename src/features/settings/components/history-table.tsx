import { Money } from "@/components/money";
import { formatUtc } from "@/lib/dates";
import { changeLabel, formatDifference } from "../history";
import type { SettingsChange } from "../service";

export function HistoryTable({ rows }: { rows: SettingsChange[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Time</th>
            <th className="px-3 py-2 font-normal">Changed by</th>
            <th className="px-3 py-2 font-normal">What</th>
            <th className="px-3 py-2 text-right font-normal">Old value</th>
            <th className="px-3 py-2 text-right font-normal">New value</th>
            <th className="px-3 py-2 text-right font-normal">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                <time dateTime={row.changedAt.toISOString()}>{formatUtc(row.changedAt)}</time>
              </td>
              <td className="px-3 py-2">{row.actorName}</td>
              <td className="px-3 py-2 font-medium">{changeLabel(row.entityName, row.field)}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                <Money cents={row.oldValueCents} />
              </td>
              <td className="px-3 py-2 text-right">
                <Money cents={row.newValueCents} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatDifference(row.oldValueCents, row.newValueCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
