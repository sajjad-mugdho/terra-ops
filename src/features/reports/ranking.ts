// Highest profit first. Equal profit: by name, so the order never jumps.
export function byProfitThenName(
  a: { planet: string; profitCents: number },
  b: { planet: string; profitCents: number },
): number {
  return b.profitCents - a.profitCents || (a.planet < b.planet ? -1 : a.planet > b.planet ? 1 : 0);
}
