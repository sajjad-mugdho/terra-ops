import { Money } from "@/components/money";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { breakEvenText } from "../profit";
import type { OpenTrip } from "../service";

type Props = { trip: Pick<OpenTrip, "earningsCents" | "fuelCostCents" | "expectedProfitCents" | "unitsToBreakEven"> };

// Earnings − fuel = expected profit, with the break-even hint and the loss warning.
export function ProfitSummary({ trip }: Props) {
  const loss = trip.expectedProfitCents < 0;
  const hint = breakEvenText(trip.unitsToBreakEven);

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-4 py-3 text-sm",
        loss && "border-destructive/40 bg-destructive/5",
      )}
    >
      <p>
        Earnings <Money cents={trip.earningsCents} /> − Fuel <Money cents={trip.fuelCostCents} /> ={" "}
        <span className="font-medium">
          Expected profit <Money cents={trip.expectedProfitCents} />
        </span>
      </p>
      {hint && <p className={loss ? "text-destructive" : "text-muted-foreground"}>{hint}</p>}
    </div>
  );
}

// Shown above "Mark as loaded". Loading a loss trip is still allowed.
export function LossWarning({ profitCents }: { profitCents: number }) {
  if (profitCents >= 0) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
      This trip will lose {formatMoney(-profitCents)}
    </p>
  );
}
