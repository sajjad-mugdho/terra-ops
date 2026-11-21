import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OVERDUE_DAYS } from "@/features/orders/waiting";
import { cn } from "@/lib/utils";

// Orders that nobody accepted or picked for more than 3 days. One click to exactly those orders.
export function OverdueCard({ count }: { count: number }) {
  const some = count > 0;
  return (
    <Card size="sm" className={cn(some && "border-destructive/40 bg-destructive/5")}>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">Waiting too long</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={cn("text-2xl font-semibold tabular-nums", some && "text-destructive")}>{count}</p>
          <p className="text-sm text-muted-foreground">
            {some
              ? `${count === 1 ? "order has" : "orders have"} waited more than ${OVERDUE_DAYS} days for a manager or a captain.`
              : `No order has waited more than ${OVERDUE_DAYS} days.`}
          </p>
        </div>
        {some && (
          <Link
            href="/admiral/orders?waiting=overdue&sort=waiting"
            className="text-sm font-medium underline underline-offset-4"
          >
            See these orders
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
