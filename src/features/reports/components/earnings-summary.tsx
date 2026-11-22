import { Fuel, PackageCheck, Rocket, TrendingUp, Wallet } from "lucide-react";
import { Money } from "@/components/money";
import { StatCard } from "@/components/stat-card";
import { formatMoney } from "@/lib/money";
import type { Earnings } from "../service";

// Completed trips only. Earnings − fuel = profit.
export function EarningsSummary({ earnings }: { earnings: Earnings }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard label="Completed trips" icon={Rocket} value={earnings.trips} />
      <StatCard label="Units delivered" icon={PackageCheck} value={earnings.units} />
      <StatCard label="Earnings" icon={Wallet} value={formatMoney(earnings.earningsCents)} />
      <StatCard label="Fuel cost" icon={Fuel} value={formatMoney(earnings.fuelCents)} />
      <StatCard label="Profit" icon={TrendingUp} value={<Money cents={earnings.profitCents} />} />
    </div>
  );
}
