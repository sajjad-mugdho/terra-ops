import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { Waiting } from "../waiting";

// "Waiting 2d 5h". Red with an "Overdue" badge after 3 days.
export function WaitingTime({ waiting, className }: { waiting: Waiting; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className={cn("tabular-nums", waiting.overdue && "font-medium text-destructive")}>
        {waiting.label}
      </span>
      {waiting.overdue && <StatusBadge label="Overdue" tone="danger" />}
    </span>
  );
}
