import { Money } from "@/components/money";
import { formatUtc } from "@/lib/dates";
import { changeLabel, formatDifference } from "../history";
import type { SettingsChange } from "../service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function HistoryTable({ rows }: { rows: SettingsChange[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Changed by</TableHead>
            <TableHead>What</TableHead>
            <TableHead className="text-right">Old value</TableHead>
            <TableHead className="text-right">New value</TableHead>
            <TableHead className="text-right">Difference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground">
                <time dateTime={row.changedAt.toISOString()}>{formatUtc(row.changedAt)}</time>
              </TableCell>
              <TableCell>{row.actorName}</TableCell>
              <TableCell className="font-medium">{changeLabel(row.entityName, row.field)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                <Money cents={row.oldValueCents} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={row.newValueCents} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDifference(row.oldValueCents, row.newValueCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
