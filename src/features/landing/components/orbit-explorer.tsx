"use client";

import { Pause, Play, Rocket } from "lucide-react";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { EARTH, type FlightRoute, ORBITS, type OrbitBody, PLUTO, routeBetween, starField } from "../orbit";
import type { LandingPlanet } from "../service";
import { CHIP, EYEBROW, LABEL } from "./styles";

const STARS = starField(56);

const BODY = "absolute top-0 left-1/2 size-10 -translate-1/2 rounded-full";

const days = (count: number) => (count === 1 ? "1 day" : `${count} days`);

function Ring({ body, children }: { body: OrbitBody; children: ReactNode }) {
  const style = {
    inset: `${50 - body.ring / 2}%`,
    "--start": `${body.start}deg`,
    "--period": `${body.period}s`,
  } as CSSProperties;
  return (
    <div className="orbit-ring pointer-events-none absolute rounded-full border border-white/10" style={style}>
      {children}
    </div>
  );
}

// Counter-turns inside its ring, so the label and Saturn's ring stay level.
function Dot({ name, body, active }: { name: string; body: OrbitBody; active: boolean }) {
  return (
    <span className="orbit-upright relative grid size-full place-items-center">
      <span
        className={cn("rounded-full", active && "ring-1 ring-white ring-offset-4 ring-offset-background")}
        style={{ width: body.dot, height: body.dot, background: body.color }}
      />
      {body.ringed && (
        <span className="absolute h-1.5 w-7 -rotate-12 rounded-[50%] border" style={{ borderColor: body.color }} />
      )}
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.12em] text-body uppercase transition-opacity",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        style={{ top: `calc(50% + ${body.dot / 2 + 6}px)` }}
      >
        {name}
      </span>
    </span>
  );
}

export function OrbitExplorer({ planets }: { planets: LandingPlanet[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [route, setRoute] = useState<FlightRoute | null>(null);
  const [stopped, setStopped] = useState(false);

  const planet = planets.find((each) => each.name === selected);
  const onRoute = planets.filter((each) => each.name in ORBITS);
  const paused = stopped || planet !== undefined;

  function toggle(name: string) {
    const next = selected === name ? null : name;
    // Commit first: the orbit has to be frozen before the two ends are measured.
    flushSync(() => {
      setSelected(next);
      setRoute(null);
    });
    const box = frame.current;
    if (!box || !next) return;
    const bodies = [...box.querySelectorAll<HTMLElement>("[data-body]")];
    const earth = bodies.find((body) => body.dataset.body === "Earth");
    const target = bodies.find((body) => body.dataset.body === next);
    if (!earth || !target) return;
    setRoute(
      routeBetween(box.getBoundingClientRect(), earth.getBoundingClientRect(), target.getBoundingClientRect()),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={frame}
        data-paused={paused ? "" : undefined}
        className="orbit relative mx-auto aspect-square w-full max-w-[560px]"
      >
        <div aria-hidden className="absolute inset-0">
          {STARS.map((star) => (
            <span
              key={`${star.x}-${star.y}`}
              className={cn("absolute rounded-full bg-white/50", star.delay !== null && "orbit-star")}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                animationDelay: star.delay === null ? undefined : `${star.delay}s`,
              }}
            />
          ))}
          <span className="absolute top-1/2 left-1/2 size-[5%] -translate-1/2 rounded-full bg-foreground" />
          <Ring body={EARTH}>
            <span data-body="Earth" className={BODY}>
              <Dot name="Earth" body={EARTH} active />
            </span>
          </Ring>
          {onRoute.map((each) => (
            <Ring key={each.name} body={ORBITS[each.name]}>
              <button
                type="button"
                tabIndex={-1}
                data-body={each.name}
                onClick={() => toggle(each.name)}
                className={cn(BODY, "group pointer-events-auto cursor-pointer")}
              >
                <Dot name={each.name} body={ORBITS[each.name]} active={each.name === selected} />
              </button>
            </Ring>
          ))}
          {route && (
            <>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 size-full text-white"
              >
                <line
                  x1={route.x1}
                  y1={route.y1}
                  x2={route.x2}
                  y2={route.y2}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                  strokeDasharray="3 5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span
                className="orbit-flight pointer-events-none absolute -translate-1/2"
                style={
                  {
                    "--x1": `${route.x1}%`,
                    "--y1": `${route.y1}%`,
                    "--x2": `${route.x2}%`,
                    "--y2": `${route.y2}%`,
                  } as CSSProperties
                }
              >
                <Rocket className="size-4" style={{ rotate: `${route.angle + 45}deg` }} />
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label={PLUTO.name}
          aria-pressed={selected === PLUTO.name}
          onClick={() => toggle(PLUTO.name)}
          className="group absolute top-[2%] right-[1%] grid size-10 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
        >
          <span className="size-1 rounded-full bg-muted-foreground transition-transform group-hover:scale-150" />
        </button>
        <button
          type="button"
          onClick={() => setStopped(!stopped)}
          className={cn(LABEL, "absolute bottom-0 left-0 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/25 px-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-white")}
        >
          {stopped ? <Play className="size-3" aria-hidden /> : <Pause className="size-3" aria-hidden />}
          {stopped ? "Play orbit" : "Pause orbit"}
        </button>
      </div>

      <div role="group" aria-label="Pick a destination" className="flex flex-wrap gap-2">
        {planets.map((each) => (
          <button
            key={each.name}
            type="button"
            aria-pressed={each.name === selected}
            onClick={() => toggle(each.name)}
            className={cn(CHIP, "cursor-pointer aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-black")}
          >
            {each.name}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-48 rounded-lg border bg-card p-6">
        {planet ? (
          <>
            <p className={EYEBROW}>Destination</p>
            <h2 className="mt-3 text-[2rem] leading-9 tracking-[-0.019em]">{planet.name}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className={LABEL}>Travel</dt>
                <dd className="mt-1 text-body">{days(planet.daysFromEarth)} from Earth</dd>
              </div>
              <div>
                <dt className={LABEL}>Delivery</dt>
                <dd className="mt-1 text-body">{formatMoney(planet.deliveryChargeCents)} per unit</dd>
              </div>
            </dl>
            {ORBITS[planet.name] && <p className="mt-4 text-sm text-muted-foreground">{ORBITS[planet.name].quip}</p>}
          </>
        ) : selected === PLUTO.name ? (
          <>
            <p className={EYEBROW}>Off the map</p>
            <h2 className="mt-3 text-[2rem] leading-9 tracking-[-0.019em]">{PLUTO.name}</h2>
            <p className="mt-4 text-body">{PLUTO.quip}</p>
          </>
        ) : (
          <>
            <p className={EYEBROW}>Destinations</p>
            <p className="mt-3 max-w-md text-body">
              Pick a planet on the map or from the list. The orbit stops and a rocket shows the route from Earth.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">There is a dot we do not deliver to. See if you can find it.</p>
          </>
        )}
      </div>
    </div>
  );
}
