// design.md: every button is a pill, labels are uppercase mono, phones get a 44px touch target.
const PILL =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-50 max-md:h-11";

export const PILL_SOLID = `${PILL} border-white bg-white text-black hover:bg-white/85`;

export const PILL_OUTLINE = `${PILL} border-white/25 text-white hover:border-white/60`;

export const CHIP =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 text-sm whitespace-nowrap text-white transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-md:h-10";

export const EYEBROW = "font-mono text-sm tracking-[0.1em] text-foreground uppercase";

export const LABEL = "font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase";

export const HEADLINE = "text-[2rem] leading-9 tracking-[-0.019em] md:text-5xl md:leading-none md:tracking-[-0.025em]";
