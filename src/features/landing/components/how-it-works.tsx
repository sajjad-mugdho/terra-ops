import { Rocket } from "lucide-react";
import { ROLE_LABEL } from "@/features/auth/roles";
import { OVERDUE_DAYS } from "@/features/orders/waiting";
import { STEPS } from "../steps";
import { DemoEntryButton, DemoEntryForm } from "./demo-entry";
import { EYEBROW, HEADLINE, LABEL } from "./styles";

// The line is vertical on phones and horizontal from md up. The rocket follows the scroll.
const LINE = "absolute top-0 bottom-0 left-4 w-px md:top-4 md:right-0 md:bottom-auto md:left-0 md:h-px md:w-auto";

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-t">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        <p className={EYEBROW}>How it works</p>
        <h2 className={`mt-4 ${HEADLINE}`}>One order, four people.</h2>
        <p className="mt-4 max-w-xl text-lg leading-7 text-body">
          Every order has one status and one owner at each step. An order that waits more than {OVERDUE_DAYS} days is
          flagged, so nothing gets lost between planets.
        </p>

        <DemoEntryForm>
          <div className="relative mt-12">
            <div aria-hidden className={`${LINE} bg-border`} />
            <div aria-hidden className={`flight-fill ${LINE} origin-top bg-white/60 md:origin-left`} />
            <span
              aria-hidden
              className="flight-rocket absolute top-full left-4 z-10 -translate-1/2 rounded-full bg-background p-1 md:top-4 md:left-full"
            >
              <Rocket className="size-5 rotate-[135deg] md:rotate-45" strokeWidth={1.5} />
            </span>
            <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
              {STEPS.map((step, index) => (
                <li key={step.role} className="relative pl-14 md:pt-14 md:pl-0">
                  <span className="absolute top-0 left-0 grid size-8 place-items-center rounded-full border border-white/25 bg-background font-mono text-xs">
                    0{index + 1}
                  </span>
                  <p className={LABEL}>{ROLE_LABEL[step.role]}</p>
                  <h3 className="mt-2 flex items-center gap-2 text-xl leading-7">
                    <step.icon className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                    {step.verb}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-body md:min-h-20">{step.text}</p>
                  <div className="mt-4">
                    <DemoEntryButton email={step.demoEmail} label={`Enter as ${ROLE_LABEL[step.role]}`} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </DemoEntryForm>
        <p className="mt-10 text-sm text-muted-foreground">
          Each button logs you in as a seeded demo user of that role. No password needed.
        </p>
      </div>
    </section>
  );
}
