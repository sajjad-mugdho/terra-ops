// Plain data, not a client module: a Server Component may read and change these.
export type SingularityState = {
  title: string;
  status: string;
  // Any CSS color: the pill and the readout values.
  accent: string;
  // Vertical turbulence of the disk. 0 is a razor plane, 5 is a storm.
  morph: number;
  // Radial squeeze. Below 1 the disk collapses inward.
  compression: number;
  intensity: number;
  orbit: number;
  // Camera auto-orbit, radians per second.
  spin: number;
  // In scene units. The horizon is 4.
  camDistance: number;
  camHeight: number;
};

export const DEFAULT_SINGULARITY_STATES: SingularityState[] = [
  {
    title: "Stable Singularity",
    status: "Topology: Nominal",
    accent: "#00f3ff",
    morph: 0.1,
    compression: 1,
    intensity: 1,
    orbit: 1,
    spin: 0.08,
    camDistance: 85,
    camHeight: 25,
  },
  {
    title: "Accretion Turbulence",
    status: "Topology: Fluctuating",
    accent: "#ffaa00",
    morph: 4.5,
    compression: 1.15,
    intensity: 1.4,
    orbit: 1.8,
    spin: 0.3,
    camDistance: 95,
    camHeight: 45,
  },
  {
    title: "Relativistic Collapse",
    status: "Topology: Critical",
    accent: "#ff0044",
    morph: 0.8,
    compression: 0.38,
    intensity: 3.5,
    orbit: 4.5,
    spin: 0.9,
    camDistance: 55,
    camHeight: 12,
  },
];
