import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startPolling, type VisibilitySource } from "./polling";

function fakeDocument(visibilityState = "visible") {
  const listeners = new Set<() => void>();
  const source: VisibilitySource = {
    visibilityState,
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
  };
  const show = (state: string) => {
    source.visibilityState = state;
    for (const listener of [...listeners]) listener();
  };
  return { source, listeners, show };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startPolling", () => {
  it("ticks every interval while the tab is visible, not before", () => {
    const tick = vi.fn();
    startPolling(tick, 10_000, fakeDocument().source);

    expect(tick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(9_999);
    expect(tick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(tick).toHaveBeenCalledTimes(4);
  });

  it("stops while the tab is hidden", () => {
    const tick = vi.fn();
    const tab = fakeDocument();
    startPolling(tick, 10_000, tab.source);

    tab.show("hidden");
    vi.advanceTimersByTime(60_000);
    expect(tick).not.toHaveBeenCalled();
  });

  it("ticks once right away when the tab becomes visible, then goes on", () => {
    const tick = vi.fn();
    const tab = fakeDocument();
    startPolling(tick, 10_000, tab.source);
    tab.show("hidden");
    vi.advanceTimersByTime(60_000);

    tab.show("visible");
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(9_999);
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(tick).toHaveBeenCalledTimes(2);
  });

  it("does not start in a tab that opens hidden", () => {
    const tick = vi.fn();
    const tab = fakeDocument("hidden");
    startPolling(tick, 10_000, tab.source);

    vi.advanceTimersByTime(60_000);
    expect(tick).not.toHaveBeenCalled();
    tab.show("visible");
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it("never runs two timers after the tab is shown twice", () => {
    const tick = vi.fn();
    const tab = fakeDocument();
    startPolling(tick, 10_000, tab.source);

    tab.show("visible");
    tab.show("visible");
    tick.mockClear();
    vi.advanceTimersByTime(30_000);
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it("clears the timer and the listener when stopped", () => {
    const tick = vi.fn();
    const tab = fakeDocument();
    const stop = startPolling(tick, 10_000, tab.source);

    stop();
    expect(tab.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    tab.show("visible");
    expect(tick).not.toHaveBeenCalled();
  });

  it("goes on after a tick that failed", () => {
    const tick = vi.fn();
    startPolling(tick, 10_000, fakeDocument().source);
    tick.mockImplementationOnce(() => {
      throw new Error("offline");
    });

    expect(() => vi.advanceTimersByTime(10_000)).toThrow("offline");
    vi.advanceTimersByTime(10_000);
    expect(tick).toHaveBeenCalledTimes(2);
  });
});
