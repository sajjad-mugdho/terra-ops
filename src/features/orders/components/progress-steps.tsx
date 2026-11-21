import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { customerLabel, ORDER_STEPS, type OrderStatus } from "../status";

export function ProgressSteps({ status }: { status: OrderStatus }) {
  const current = ORDER_STEPS.indexOf(status);
  const finished = status === "DELIVERED";

  return (
    <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {ORDER_STEPS.map((step, index) => {
        const done = index < current || finished;
        const active = index === current && !finished;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs lg:flex-col lg:items-start",
              done && "border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40",
              active && "border-primary bg-primary/5 font-medium",
              !done && !active && "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem]",
                done && "border-emerald-600 bg-emerald-600 text-white",
                active && "border-primary",
              )}
            >
              {done ? <Check className="size-3" aria-hidden /> : index + 1}
            </span>
            <span>
              {customerLabel(step)}
              <span className="sr-only">{done ? " (done)" : active ? " (current)" : " (upcoming)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
