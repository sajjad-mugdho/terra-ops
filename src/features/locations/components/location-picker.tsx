"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatMoney } from "@/lib/money";
import type { PlanetNode } from "../service";
import { findDivision } from "../tree";

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
          <NativeSelect
            id="planet"
            className="w-full"
            value={planetId}
            onChange={(event) => {
              setPlanetId(event.target.value);
              setSectorId("");
              onChange(null);
            }}
          >
            <NativeSelectOption value="">Choose a planet</NativeSelectOption>
            {tree.map((each) => (
              <NativeSelectOption key={each.id} value={each.id}>
                {each.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sector">Sector</Label>
          <NativeSelect
            id="sector"
            className="w-full"
            value={sectorId}
            disabled={!planet}
            onChange={(event) => {
              setSectorId(event.target.value);
              onChange(null);
            }}
          >
            <NativeSelectOption value="">Choose a sector</NativeSelectOption>
            {planet?.sectors.map((each) => (
              <NativeSelectOption key={each.id} value={each.id}>
                {each.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="division">Division</Label>
          <NativeSelect
            id="division"
            className="w-full"
            value={divisionId ?? ""}
            disabled={!sector}
            onChange={(event) => onChange(event.target.value || null)}
          >
            <NativeSelectOption value="">Choose a division</NativeSelectOption>
            {sector?.divisions.map((each) => (
              <NativeSelectOption key={each.id} value={each.id}>
                {each.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
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
