// ring: orbit width in % of the square. dot: px. period: seconds per lap. start: first angle in degrees.
export type OrbitBody = {
  ring: number;
  dot: number;
  color: string;
  period: number;
  start: number;
  ringed?: boolean;
};

export const EARTH: OrbitBody = { ring: 34, dot: 10, color: "var(--breeze)", period: 40, start: 215 };

// The look of each planet. Days and charges come from the database, never from here.
export const ORBITS: Record<string, OrbitBody & { quip: string }> = {
  Mercury: {
    ring: 16,
    dot: 6,
    color: "var(--muted-foreground)",
    period: 18,
    start: 300,
    quip: "Closest to the Sun. Pack light, pack reflective.",
  },
  Venus: {
    ring: 25,
    dot: 9,
    color: "var(--sunset-soft)",
    period: 28,
    start: 120,
    quip: "Next door to Earth, and the worst weather around.",
  },
  Mars: {
    ring: 43,
    dot: 8,
    color: "var(--sunset)",
    period: 56,
    start: 20,
    quip: "The popular stop. The dust gets into everything.",
  },
  Jupiter: {
    ring: 57,
    dot: 18,
    color: "var(--body)",
    period: 90,
    start: 160,
    quip: "The biggest planet on the route. Same delivery form.",
  },
  Saturn: {
    ring: 71,
    dot: 14,
    color: "var(--sunset-soft)",
    period: 130,
    start: 75,
    ringed: true,
    quip: "Captains fly around the rings, not through them.",
  },
  Uranus: {
    ring: 84,
    dot: 12,
    color: "var(--twilight)",
    period: 180,
    start: 250,
    quip: "Captains have heard every joke. Please don't.",
  },
  Neptune: {
    ring: 96,
    dot: 12,
    color: "var(--dusk)",
    period: 240,
    start: 330,
    quip: "A long way out. Order the birthday cake now.",
  },
};

export const PLUTO = { name: "Pluto", quip: "Not a planet. Not on our route. Not our decision." };

export type Star = { x: number; y: number; size: number; delay: number | null };

// A fixed seed instead of Math.random, so the server and the browser draw the same sky.
export function starField(count: number, seed = 7): Star[] {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: Math.round(next() * 1000) / 10,
    y: Math.round(next() * 1000) / 10,
    size: next() < 0.2 ? 2 : 1,
    delay: next() < 0.3 ? Math.round(next() * 50) / 10 : null,
  }));
}

type Box = { left: number; top: number; width: number; height: number };

// x and y in % of the frame, so the route still fits after a resize.
export type FlightRoute = { x1: number; y1: number; x2: number; y2: number; angle: number };

const centerIn = (frame: Box, box: Box) => ({
  x: ((box.left + box.width / 2 - frame.left) / frame.width) * 100,
  y: ((box.top + box.height / 2 - frame.top) / frame.height) * 100,
});

// angle: degrees clockwise from "pointing right", measured in pixels because the frame may not be square.
export function routeBetween(frame: Box, from: Box, to: Box): FlightRoute {
  const start = centerIn(frame, from);
  const end = centerIn(frame, to);
  const dx = ((end.x - start.x) * frame.width) / 100;
  const dy = ((end.y - start.y) * frame.height) / 100;
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}
