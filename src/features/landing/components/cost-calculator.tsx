"use client";

import Link from "next/link";
import { useState } from "react";
import { etaText } from "@/features/orders/eta";
import { lineTotalCents, MAX_UNITS } from "@/features/orders/pricing";
import { formatMoney } from "@/lib/money";
import type { LandingCatalog } from "../service";
import { EYEBROW, LABEL, PILL_OUTLINE } from "./styles";

type Option = { name: string; hint: string };

// Real radio inputs, so the arrow keys work without any code.
function PillRadios({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className={LABEL}>{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.name} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.name}
              checked={option.name === value}
              onChange={() => onChange(option.name)}
              className="peer sr-only"
            />
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/25 px-4 text-sm text-white transition-colors peer-checked:border-white peer-checked:bg-white peer-checked:text-black peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white hover:border-white/60 max-md:h-10">
              {option.name}
              <span className="font-mono text-xs opacity-60">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CostCalculator({ planets, products }: LandingCatalog) {
  const [planetName, setPlanetName] = useState(planets.find((planet) => planet.name === "Mars")?.name);
  const [productName, setProductName] = useState(products.find((product) => product.name === "Water")?.name);
  const [units, setUnits] = useState(5);

  const planet = planets.find((each) => each.name === planetName) ?? planets[0];
  const product = products.find((each) => each.name === productName) ?? products[0];
  if (!planet || !product) return null;

  const totalCents = lineTotalCents({
    units,
    unitPriceCents: product.priceCents,
    unitDeliveryChargeCents: planet.deliveryChargeCents,
  });
  const eta = etaText({
    status: "PLACED",
    planet: planet.name,
    daysFromEarth: planet.daysFromEarth,
    liftedOffAt: null,
    deliveredAt: null,
  });

  return (
    <div className="grid gap-10 rounded-lg border bg-card p-6 md:grid-cols-2 md:p-10">
      <div className="flex flex-col gap-8">
        <PillRadios
          legend="Destination"
          name="planet"
          value={planet.name}
          onChange={setPlanetName}
          options={planets.map((each) => ({ name: each.name, hint: `${each.daysFromEarth}d` }))}
        />
        <PillRadios
          legend="Product"
          name="product"
          value={product.name}
          onChange={setProductName}
          options={products.map((each) => ({ name: each.name, hint: formatMoney(each.priceCents) }))}
        />
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="landing-units" className={LABEL}>
              Units
            </label>
            <span className="font-mono text-sm tabular-nums">
              {units} of {MAX_UNITS}
            </span>
          </div>
          <input
            id="landing-units"
            type="range"
            min={1}
            max={MAX_UNITS}
            step={1}
            value={units}
            onChange={(event) => setUnits(Number(event.target.value))}
            className="mt-4 h-6 w-full cursor-pointer accent-white"
          />
          <p className="mt-2 text-sm text-muted-foreground">One order holds up to {MAX_UNITS} units. So does one ship.</p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-8 md:border-l md:pl-10">
        <div>
          <p className={EYEBROW}>Total</p>
          <output
            htmlFor="landing-units"
            className="mt-4 block text-5xl leading-none tracking-[-0.025em] tabular-nums md:text-7xl"
          >
            {formatMoney(totalCents)}
          </output>
          <p className="mt-4 font-mono text-xs tracking-[0.05em] text-muted-foreground">
            {units} x ({formatMoney(product.priceCents)} {product.name.toLowerCase()} +{" "}
            {formatMoney(planet.deliveryChargeCents)} delivery)
          </p>
          <p className="mt-6 text-body">
            {planet.name}. {eta}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/sign-up" className={PILL_OUTLINE}>
            Create an account to order
          </Link>
          <p className="text-sm text-muted-foreground">Same prices as the checkout.</p>
        </div>
      </div>
    </div>
  );
}
