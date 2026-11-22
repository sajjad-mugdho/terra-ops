"use client";

import { Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LABEL, PILL_OUTLINE } from "./styles";

const TICK_MS = 700;

const LOG = [
  "Lift-off. Nothing was on board, but it left on time.",
  "Lift-off. The Planet Manager would like to know who approved this.",
  "Lift-off. That is 0 units delivered for a full tank of fuel.",
  "Lift-off. The Grand Admiral's dashboard has questions.",
  "Lift-off. The Captain reports a smooth flight and no cargo.",
  "Lift-off. Please stop. Rockets are not free.",
];

// count: 3, 2, 1, then 0 while the rocket flies. null while it waits on the pad.
export function LaunchPad() {
  const [count, setCount] = useState<number | null>(null);
  const [launched, setLaunched] = useState(0);

  useEffect(() => {
    if (!count) return;
    const timer = setTimeout(() => setCount(count - 1), TICK_MS);
    return () => clearTimeout(timer);
  }, [count]);

  function land() {
    setLaunched(launched + 1);
    setCount(null);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative z-20 flex h-40 w-full max-w-xs items-end justify-center border-b border-white/25 pb-1">
        <span
          key={launched}
          onAnimationEnd={count === 0 ? land : undefined}
          className={count === 0 ? "launch-liftoff" : "animate-in fade-in duration-700"}
        >
          <span className={cn("block", count !== null && count > 0 && "launch-rumble")}>
            <Rocket className="size-20 -rotate-45" strokeWidth={1} aria-hidden />
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => setCount(3)}
        disabled={count !== null}
        className={cn(PILL_OUTLINE, "min-w-32 cursor-pointer font-mono tracking-[0.1em] uppercase")}
      >
        {count === null ? "Launch" : count === 0 ? "Lift-off" : `T-${count}`}
      </button>

      <div aria-live="polite" className="flex min-h-12 flex-col items-center gap-1 text-center">
        {launched > 0 && (
          <>
            <p className="text-body">{LOG[(launched - 1) % LOG.length]}</p>
            <p className={LABEL}>Rockets launched: {launched}</p>
          </>
        )}
      </div>
    </div>
  );
}
