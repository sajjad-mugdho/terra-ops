import Link from "next/link";
import { LABEL } from "./styles";

const LINK = "text-sm text-muted-foreground transition-colors hover:text-foreground max-md:inline-flex max-md:min-h-11 max-md:items-center";

// Layout adapted from the 21st.dev "Footer with Big Wordmark" (MIT), restyled with design.md tokens.
export function LandingFooter() {
  return (
    <footer className="overflow-hidden border-t">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-6 pt-12 pb-10 md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="text-xl leading-7">Terra Supply Co.</p>
          <p className="mt-3 max-w-xs text-sm leading-5 text-muted-foreground">
            Supplies from Earth to every planet. Orders, trips and profit in one place.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            All rockets nominal
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-5 md:col-start-8">
          <div>
            <p className={LABEL}>Explore</p>
            <ul className="mt-4 grid gap-2.5 max-md:gap-0">
              <li>
                <a href="#planets" className={LINK}>
                  Planets
                </a>
              </li>
              <li>
                <a href="#how" className={LINK}>
                  How it works
                </a>
              </li>
              <li>
                <a href="#cost" className={LINK}>
                  Cost
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className={LABEL}>Account</p>
            <ul className="mt-4 grid gap-2.5 max-md:gap-0">
              <li>
                <Link href="/login" className={LINK}>
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className={LINK}>
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <p className={`mx-auto w-full max-w-[1200px] px-6 pb-6 ${LABEL}`}>
        Demo project. Prices in USD, times in Earth time (UTC).
      </p>
      <p
        aria-hidden
        className="pointer-events-none -mb-[0.06em] text-center text-[clamp(96px,26vw,360px)] leading-[0.95] tracking-[-0.04em] text-transparent select-none [-webkit-text-stroke:1px_rgb(255_255_255/0.16)]"
      >
        Terra
      </p>
    </footer>
  );
}
