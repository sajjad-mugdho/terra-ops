import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";

// One tooltip line: a stroke of the series color, its name, then the exact amount.
export function moneyTooltipRow(label: ReactNode, cents: number, color: string | undefined) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {label}
      </span>
      <span className="font-medium text-foreground tabular-nums">{formatMoney(cents)}</span>
    </div>
  );
}
