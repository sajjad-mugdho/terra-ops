import { beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "@/seed/reference";
import { actAs, actAsNobody } from "@/test/session";
import { getCurrentUser, requireManagerPlanet, requireRole, requireUser } from "./session";

beforeAll(seedReference);

describe("getCurrentUser", () => {
  it("returns null without a session", async () => {
    actAsNobody();
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns a customer without a planet", async () => {
    await actAs("customer1@terra.demo");
    expect(await getCurrentUser()).toMatchObject({
      email: "customer1@terra.demo",
      role: "customer",
      planetId: null,
      planetName: null,
    });
  });

  it("returns a manager with the planet they manage", async () => {
    await actAs("manager.mars@terra.demo");
    const user = await getCurrentUser();
    expect(user).toMatchObject({ role: "manager", planetName: "Mars" });
    expect(user?.planetId).toEqual(expect.any(String));
  });
});

describe("requireUser and requireRole", () => {
  it("throws UNAUTHORIZED without a session", async () => {
    actAsNobody();
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(requireRole("admiral")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("passes for the right role", async () => {
    await actAs("admiral@terra.demo");
    await expect(requireRole("admiral")).resolves.toMatchObject({ role: "admiral" });
    await expect(requireRole("manager", "admiral")).resolves.toMatchObject({ role: "admiral" });
  });

  it("throws FORBIDDEN for a wrong role", async () => {
    await actAs("customer1@terra.demo");
    await expect(requireRole("admiral")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireRole("manager", "captain")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("requireManagerPlanet", () => {
  it("returns the manager's planet", async () => {
    await actAs("manager.venus@terra.demo");
    await expect(requireManagerPlanet()).resolves.toMatchObject({ planetName: "Venus" });
  });

  it("throws FORBIDDEN for anyone who is not a manager", async () => {
    await actAs("captain1@terra.demo");
    await expect(requireManagerPlanet()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
