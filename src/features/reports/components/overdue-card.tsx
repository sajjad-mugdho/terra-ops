import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { OVERDUE_DAYS } from "@/features/orders/waiting";

// Orders that nobody accepted or picked for more than 3 days. One click to exactly those orders.
export function OverdueCard({ count }: { count: number }) {
  const some = count > 0;
  return (
    <StatCard
      label="Waiting too long"
      icon={TriangleAlert}
      value={count}
      danger={some}
      hint={
        some ? (
          <>
            {count === 1 ? "Order has" : "Orders have"} waited more than {OVERDUE_DAYS} days for a manager or a
            captain.{" "}
            <Link
              href="/admiral/orders?waiting=overdue&sort=waiting"
              className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
            >
              See these orders
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </>
        ) : (
          `No order has waited more than ${OVERDUE_DAYS} days.`
        )
      }
    />
  );
}
