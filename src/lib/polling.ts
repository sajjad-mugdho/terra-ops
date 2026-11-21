// The part of `document` that polling needs, so a test can pass a fake one.
export type VisibilitySource = {
  visibilityState: string;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};

// Runs `tick` every `intervalMs` while the tab is visible, and once right away when it comes back.
export function startPolling(tick: () => void, intervalMs: number, source: VisibilitySource): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const start = () => {
    stop();
    timer = setInterval(tick, intervalMs);
  };
  const onChange = () => {
    if (source.visibilityState !== "visible") return stop();
    tick();
    start();
  };

  if (source.visibilityState === "visible") start();
  source.addEventListener("visibilitychange", onChange);

  return () => {
    stop();
    source.removeEventListener("visibilitychange", onChange);
  };
}
