import { CircleDollarSign, Factory, PackageCheck, TrendingUp } from "lucide-react";
import { Money } from "@/components/money";
import { Delta, StatCard } from "@/components/stat-card";
import { formatMoney } from "@/lib/money";
import { percentChange } from "../series";
import type { CompanyTotals } from "../service";
import { OverdueCard } from "./overdue-card";

type Props = { totals: CompanyTotals; before: CompanyTotals; against: string; overdue: number };

// The headline numbers of the range against the period before, then what needs attention now.
export function TotalsCards({ totals, before, against, overdue }: Props) {
  const change = (key: keyof CompanyTotals) => (
    <Delta percent={percentChange(totals[key], before[key])} against={against} />
  );

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label="Revenue"
        icon={CircleDollarSign}
        value={formatMoney(totals.revenueCents)}
        hint={change("revenueCents")}
      />
      <StatCard
        label="Profit"
        icon={TrendingUp}
        value={<Money cents={totals.profitCents} />}
        hint={change("profitCents")}
      />
      <StatCard
        label="Making cost"
        icon={Factory}
        value={formatMoney(totals.makingCostCents)}
        hint="What the delivered products cost to make"
      />
      <StatCard
        label="Units delivered"
        icon={PackageCheck}
        value={totals.unitsDelivered}
        hint={change("unitsDelivered")}
      />
      <OverdueCard count={overdue} />
    </div>
  );
}
