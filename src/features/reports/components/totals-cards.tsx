import { Money } from "@/components/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompanyTotals } from "../service";

export function TotalsCards({ totals }: { totals: CompanyTotals }) {
  const cards = [
    { label: "Units delivered", value: <span className="tabular-nums">{totals.unitsDelivered}</span> },
    { label: "Revenue", value: <Money cents={totals.revenueCents} /> },
    { label: "Making cost", value: <Money cents={totals.makingCostCents} /> },
    { label: "Profit", value: <Money cents={totals.profitCents} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{card.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}
