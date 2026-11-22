import { describe, expect, it } from "vitest";
import { PLANETS } from "@/seed/data";
import { EARTH, ORBITS, PLUTO, routeBetween, starField } from "./orbit";

describe("ORBITS", () => {
  it("has an orbit for every seeded planet", () => {
    for (const planet of PLANETS) expect(ORBITS[planet.name], planet.name).toBeDefined();
  });

  it("keeps every ring inside the frame and no two rings the same", () => {
    const rings = [EARTH, ...Object.values(ORBITS)].map((body) => body.ring);
    expect(new Set(rings).size).toBe(rings.length);
    for (const ring of rings) {
      expect(ring).toBeGreaterThan(0);
      expect(ring).toBeLessThanOrEqual(100);
    }
  });

  it("puts Earth between Venus and Mars", () => {
    expect(EARTH.ring).toBeGreaterThan(ORBITS.Venus.ring);
    expect(EARTH.ring).toBeLessThan(ORBITS.Mars.ring);
  });

  it("does not route to Pluto", () => {
    expect(ORBITS[PLUTO.name]).toBeUndefined();
  });
});

describe("starField", () => {
  it("draws the same sky every time", () => {
    expect(starField(40)).toEqual(starField(40));
    expect(starField(40, 1)).not.toEqual(starField(40, 2));
  });

  it("keeps every star inside the frame", () => {
    const stars = starField(200);
    expect(stars).toHaveLength(200);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(100);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(100);
      expect([1, 2]).toContain(star.size);
    }
  });
});

describe("routeBetween", () => {
  const frame = { left: 100, top: 50, width: 400, height: 400 };
  const at = (x: number, y: number) => ({ left: x - 5, top: y - 5, width: 10, height: 10 });

  it("gives both ends in percent of the frame", () => {
    expect(routeBetween(frame, at(200, 150), at(400, 350))).toMatchObject({ x1: 25, y1: 25, x2: 75, y2: 75 });
  });

  it("points right, down, left and up", () => {
    const from = at(300, 250);
    expect(routeBetween(frame, from, at(400, 250)).angle).toBeCloseTo(0);
    expect(routeBetween(frame, from, at(300, 350)).angle).toBeCloseTo(90);
    expect(Math.abs(routeBetween(frame, from, at(200, 250)).angle)).toBeCloseTo(180);
    expect(routeBetween(frame, from, at(300, 150)).angle).toBeCloseTo(-90);
  });

  it("measures the angle in pixels when the frame is not square", () => {
    const wide = { left: 0, top: 0, width: 400, height: 200 };
    expect(routeBetween(wide, at(100, 50), at(200, 150)).angle).toBeCloseTo(45);
  });
});
