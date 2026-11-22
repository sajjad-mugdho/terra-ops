import { describe, expect, it } from "vitest";
import { DEMO_USERS } from "@/features/auth/demo-users";
import { ROLES } from "@/features/auth/roles";
import { STEPS } from "./steps";

describe("STEPS", () => {
  it("covers every role exactly once", () => {
    expect(STEPS.map((step) => step.role).sort()).toEqual([...ROLES].sort());
  });

  it("opens a demo account of the same role", () => {
    for (const step of STEPS) {
      const user = DEMO_USERS.find((each) => each.email === step.demoEmail);
      expect(user?.role, step.demoEmail).toBe(step.role);
    }
  });
});
