import { describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "./status";
import {
  isOverdue,
  OVERDUE_DAYS,
  parseOrderSort,
  waitingLabel,
  waitingOf,
  waitingSince,
} from "./waiting";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date("2026-11-22T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const createdAt = ago(10 * DAY);
const acceptedAt = ago(4 * DAY);

describe("waitingSince", () => {
  it("counts a PLACED order from when it was placed", () => {
    expect(waitingSince({ status: "PLACED", createdAt, acceptedAt: null })).toBe(createdAt);
  });

  it("counts an ACCEPTED order from when it was accepted", () => {
    expect(waitingSince({ status: "ACCEPTED", createdAt, acceptedAt })).toBe(acceptedAt);
  });

  it("keeps the first accepted time for an order that came back from a trip", () => {
    // Removing an order from a trip sets it back to ACCEPTED and leaves accepted_at alone.
    const returned = { status: "ACCEPTED" as const, createdAt, acceptedAt };
    expect(waitingSince(returned)).toBe(acceptedAt);
    expect(isOverdue(waitingSince(returned), NOW)).toBe(true);
  });

  it.each(ORDER_STATUSES.filter((status) => status !== "PLACED" && status !== "ACCEPTED"))(
    "does not wait in %s",
    (status) => {
      expect(waitingSince({ status, createdAt, acceptedAt })).toBeNull();
    },
  );
});

describe("isOverdue", () => {
  it("uses a threshold of 3 days", () => {
    expect(OVERDUE_DAYS).toBe(3);
  });

  it("is not overdue just under 3 days", () => {
    expect(isOverdue(ago(3 * DAY - 1), NOW)).toBe(false);
  });

  it("is not overdue at exactly 3 days", () => {
    expect(isOverdue(ago(3 * DAY), NOW)).toBe(false);
  });

  it("is overdue one millisecond past 3 days", () => {
    expect(isOverdue(ago(3 * DAY + 1), NOW)).toBe(true);
  });

  it("is never overdue for an order that does not wait", () => {
    expect(isOverdue(null, NOW)).toBe(false);
  });

  it("does not depend on the local time zone", () => {
    const since = new Date("2026-11-19T12:00:00.000+00:00");
    expect(isOverdue(since, new Date("2026-11-22T18:00:00.000+06:00"))).toBe(false);
    expect(isOverdue(since, new Date("2026-11-22T18:00:00.001+06:00"))).toBe(true);
  });
});

describe("waitingLabel", () => {
  it("says Just now under one minute", () => {
    expect(waitingLabel(NOW, NOW)).toBe("Just now");
    expect(waitingLabel(ago(MINUTE - 1), NOW)).toBe("Just now");
  });

  it("shows minutes, then hours, then days", () => {
    expect(waitingLabel(ago(MINUTE), NOW)).toBe("Waiting 1m");
    expect(waitingLabel(ago(3 * HOUR + 20 * MINUTE), NOW)).toBe("Waiting 3h 20m");
    expect(waitingLabel(ago(2 * DAY + 5 * HOUR), NOW)).toBe("Waiting 2d 5h");
  });

  it("says Just now when the database clock is slightly ahead", () => {
    expect(waitingLabel(new Date(NOW.getTime() + 500), NOW)).toBe("Just now");
  });
});

describe("waitingOf", () => {
  it("is null for an order that does not wait", () => {
    expect(waitingOf(null, NOW)).toBeNull();
  });

  it("gives the text and the overdue flag", () => {
    expect(waitingOf(ago(2 * DAY + 5 * HOUR), NOW)).toEqual({ label: "Waiting 2d 5h", overdue: false });
    expect(waitingOf(ago(15 * DAY), NOW)).toEqual({ label: "Waiting 15d 0h", overdue: true });
  });
});

describe("parseOrderSort", () => {
  it("reads waiting and falls back to newest", () => {
    expect(parseOrderSort("waiting")).toBe("waiting");
    expect(parseOrderSort("newest")).toBe("newest");
    expect(parseOrderSort(undefined)).toBe("newest");
    expect(parseOrderSort(["waiting"])).toBe("newest");
    expect(parseOrderSort("drop table")).toBe("newest");
  });
});
