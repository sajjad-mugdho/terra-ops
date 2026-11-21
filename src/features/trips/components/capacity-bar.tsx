import { TRIP_CAPACITY } from "../status";

export function CapacityBar({ units }: { units: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Capacity</span>
        <span className="tabular-nums">
          {units} / {TRIP_CAPACITY} units
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Trip capacity"
        aria-valuemin={0}
        aria-valuemax={TRIP_CAPACITY}
        aria-valuenow={units}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${(units / TRIP_CAPACITY) * 100}%` }} />
      </div>
    </div>
  );
}
