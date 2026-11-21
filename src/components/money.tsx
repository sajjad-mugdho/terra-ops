import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

// A loss is red and carries its minus sign.
export function Money({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={cn("tabular-nums", cents < 0 && "text-destructive", className)}>
      {formatMoney(cents)}
    </span>
  );
}
