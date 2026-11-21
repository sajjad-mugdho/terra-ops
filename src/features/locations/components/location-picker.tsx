"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import type { PlanetNode } from "../service";
import { findDivision } from "../tree";

const SELECT =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

type Props = {
  tree: PlanetNode[];
  divisionId: string | null;
  onChange: (divisionId: string | null) => void;
};

export function LocationPicker({ tree, divisionId, onChange }: Props) {
  const chosen = findDivision(tree, divisionId);
  const [planetId, setPlanetId] = useState(chosen?.planet.id ?? "");
  const [sectorId, setSectorId] = useState(chosen?.sector.id ?? "");

  const planet = tree.find((each) => each.id === planetId);
  const sector = planet?.sectors.find((each) => each.id === sectorId);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="planet">Planet</Label>
          <select
            id="planet"
            className={SELECT}
            value={planetId}
            onChange={(event) => {
              setPlanetId(event.target.value);
              setSectorId("");
              onChange(null);
            }}
          >
            <option value="">Choose a planet</option>
            {tree.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sector">Sector</Label>
          <select
            id="sector"
            className={SELECT}
            value={sectorId}
            disabled={!planet}
            onChange={(event) => {
              setSectorId(event.target.value);
              onChange(null);
            }}
          >
            <option value="">Choose a sector</option>
            {planet?.sectors.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="division">Division</Label>
          <select
            id="division"
            className={SELECT}
            value={divisionId ?? ""}
            disabled={!sector}
            onChange={(event) => onChange(event.target.value || null)}
          >
            <option value="">Choose a division</option>
            {sector?.divisions.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {planet
          ? `${planet.name} is ${planet.daysFromEarth} days from Earth. Delivery charge: ${formatMoney(planet.deliveryChargeCents)} per unit.`
          : "Choose a planet to see its distance and delivery charge."}
      </p>
    </div>
  );
}
