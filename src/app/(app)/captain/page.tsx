import type { Metadata } from "next";
import Link from "next/link";
import { MoneyBarChart } from "@/components/charts/money-bar-chart";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageRole } from "@/features/auth/guards";
import { EarningsSummary } from "@/features/reports/components/earnings-summary";
import { getMyEarnings } from "@/features/reports/service";
import { CapacityBar } from "@/features/trips/components/capacity-bar";
import { ProfitSummary } from "@/features/trips/components/profit-summary";
import { getMyOpenTrip, listMyTrips } from "@/features/trips/service";
import { tripCode, tripLabel, tripTone } from "@/features/trips/status";

export const metadata: Metadata = { title: "Dashboard" };

export default async function CaptainHomePage() {
  await requirePageRole("captain");
  const [earnings, open, completed] = await Promise.all([
    getMyEarnings(),
    getMyOpenTrip(),
    listMyTrips({ status: "COMPLETED" }),
  ]);
  // The list is newest first. The chart reads left to right in time.
  const flown = completed.rows.toReversed();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your trips in numbers. Totals count completed trips only. Earnings − fuel = profit."
      />

      <div className="flex flex-col gap-6">
        <EarningsSummary earnings={earnings} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Earnings and fuel by trip</CardTitle>
              <CardDescription>
                {flown.length === 0
                  ? "Your completed trips appear here."
                  : `Your last ${flown.length} completed ${flown.length === 1 ? "trip" : "trips"}, oldest first.`}
              </CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/captain/trips" />}>
                  All trips
                </Button>
              </CardAction>
            </CardHeader>
            {flown.length > 0 && (
              <CardContent>
                <MoneyBarChart
                  rows={flown.map((trip) => ({
                    name: tripCode(trip.number),
                    earningsCents: trip.earningsCents,
                    fuelCostCents: trip.fuelCostCents,
                  }))}
                  series={[
                    { key: "earningsCents", label: "Earnings", color: "var(--chart-1)" },
                    { key: "fuelCostCents", label: "Fuel", color: "var(--chart-2)" },
                  ]}
                />
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{open ? `${tripCode(open.number)} to ${open.planet.name}` : "No open trip"}</CardTitle>
              <CardDescription>
                {open ? "Your current trip. Not in the totals until it is completed." : "Choose a planet to start one."}
              </CardDescription>
              {open && (
                <CardAction>
                  <StatusBadge label={tripLabel(open.status)} tone={tripTone(open.status)} />
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {open && (
                <>
                  <CapacityBar units={open.totalUnits} />
                  <ProfitSummary trip={open} />
                </>
              )}
              <Button nativeButton={false} render={<Link href="/captain/trip" />}>
                {open ? "Open current trip" : "Start a trip"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
