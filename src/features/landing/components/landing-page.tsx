import { Rocket } from "lucide-react";
import Link from "next/link";
import { TRIP_CAPACITY } from "@/features/trips/status";
import type { LandingCatalog } from "../service";
import { CostCalculator } from "./cost-calculator";
import { CountUp } from "./count-up";
import { HowItWorks } from "./how-it-works";
import { LandingFooter } from "./landing-footer";
import { LaunchPad } from "./launch-pad";
import { OrbitExplorer } from "./orbit-explorer";
import { EYEBROW, HEADLINE, LABEL, PILL_OUTLINE, PILL_SOLID } from "./styles";

const CONTAINER = "mx-auto w-full max-w-[1200px] px-6";

const NAV_LINK = "text-sm text-body transition-colors hover:text-foreground";

const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

// "Food, machines, oxygen, plants, and water"
function sentenceList(names: string[]): string {
  const text = list.format(names.map((name) => name.toLowerCase()));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <li className="px-6 py-8 max-md:border-b md:border-l md:first:border-l-0">
      <p className="text-5xl leading-none tracking-[-0.025em]">
        <CountUp value={value} />
      </p>
      <p className={`mt-3 ${LABEL}`}>{label}</p>
    </li>
  );
}

export function LandingPage({ catalog }: { catalog: LandingCatalog }) {
  const { planets, products } = catalog;
  const nearest = planets.at(0);
  const farthest = planets.at(-1);

  return (
    <div className="landing dark flex flex-1 flex-col overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className={`${CONTAINER} flex h-14 items-center justify-between gap-6`}>
          <Link href="/" className="flex items-center gap-2 text-sm">
            <Rocket className="size-4" aria-hidden />
            Terra Supply Co.
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
            <a href="#planets" className={NAV_LINK}>
              Planets
            </a>
            <a href="#how" className={NAV_LINK}>
              How it works
            </a>
            <a href="#cost" className={NAV_LINK}>
              Cost
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className={NAV_LINK}>
              Log in
            </Link>
            <Link href="/sign-up" className={`${PILL_OUTLINE} h-8 px-4 max-md:h-9`}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section
          className={`${CONTAINER} grid items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16`}
        >
          <div>
            <p className={EYEBROW}>Earth to {planets.length} planets</p>
            <h1 className="mt-6 text-5xl leading-none tracking-[-0.025em] md:text-7xl">Supplies for every planet.</h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-body">
              {products.length > 0 ? sentenceList(products.map((product) => product.name)) : "Supplies"}, flown from
              Earth to {planets.length} planets.
              Order in a minute, follow every step, and know the price before you pay.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login" className={PILL_SOLID}>
                Try the demo
              </Link>
              <a href="#how" className={PILL_OUTLINE}>
                How it works
              </a>
            </div>
          </div>
          <div id="planets" className="scroll-mt-20">
            <OrbitExplorer planets={planets} />
          </div>
        </section>

        <section aria-label="In numbers" className="border-t">
          <ul className={`${CONTAINER} grid grid-cols-2 px-0 md:grid-cols-5`}>
            <Fact value={planets.length} label="Planets on the route" />
            <Fact value={products.length} label="Products from Earth" />
            <Fact value={TRIP_CAPACITY} label="Units on one ship" />
            {nearest && <Fact value={nearest.daysFromEarth} label={`Days to ${nearest.name}, the nearest`} />}
            {farthest && <Fact value={farthest.daysFromEarth} label={`Days to ${farthest.name}, the farthest`} />}
          </ul>
        </section>

        <HowItWorks />

        <section id="cost" className="scroll-mt-16 border-t">
          <div className={`${CONTAINER} py-16`}>
            <p className={EYEBROW}>What it costs</p>
            <h2 className={`mt-4 ${HEADLINE}`}>Price a delivery.</h2>
            <p className="mt-4 max-w-xl text-lg leading-7 text-body">
              Every unit pays the product price plus the delivery charge of its planet. No other fees.
            </p>
            <div className="mt-10">
              <CostCalculator planets={planets} products={products} />
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className={`${CONTAINER} flex flex-col items-center py-16 text-center`}>
            <p className={EYEBROW}>Launch pad</p>
            <h2 className={`mt-4 ${HEADLINE}`}>Go on, press it.</h2>
            <p className="mt-4 max-w-md text-lg leading-7 text-body">
              This rocket carries nothing and delivers nowhere. The real ones are inside.
            </p>
            <div className="mt-8 w-full">
              <LaunchPad />
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/login" className={PILL_SOLID}>
                Try the demo
              </Link>
              <Link href="/sign-up" className={PILL_OUTLINE}>
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
