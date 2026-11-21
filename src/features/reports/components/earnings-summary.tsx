import { Money } from "@/components/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Earnings } from "../service";

export function EarningsSummary({ earnings }: { earnings: Earnings }) {
  const cards = [
    { label: "Completed trips", value: <span className="tabular-nums">{earnings.trips}</span> },
    { label: "Units delivered", value: <span className="tabular-nums">{earnings.units}</span> },
    { label: "Earnings", value: <Money cents={earnings.earningsCents} /> },
    { label: "Fuel cost", value: <Money cents={earnings.fuelCents} /> },
    { label: "Profit", value: <Money cents={earnings.profitCents} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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
