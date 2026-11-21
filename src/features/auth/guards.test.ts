import { beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "@/seed/reference";
import { redirectTarget } from "@/test/redirect";
import { actAs, actAsNobody, requestHeaders } from "@/test/session";
import { redirectIfSignedIn, requirePageRole } from "./guards";
import { ROLE_HOME, ROLES, type Role } from "./roles";

const EMAIL: Record<Role, string> = {
  admiral: "admiral@terra.demo",
  manager: "manager.mars@terra.demo",
  captain: "captain1@terra.demo",
  customer: "customer1@terra.demo",
};

const pairs = ROLES.flatMap((signedIn) => ROLES.map((page) => [signedIn, page] as const));

beforeAll(seedReference);

describe("requirePageRole", () => {
  it.each(ROLES)("sends a visitor on the %s pages to /login", async (page) => {
    actAsNobody();
    expect(await redirectTarget(() => requirePageRole(page))).toBe("/login");
  });

  it.each(ROLES)("lets a %s open their own pages", async (role) => {
    await actAs(EMAIL[role]);
    await expect(requirePageRole(role)).resolves.toMatchObject({ email: EMAIL[role], role });
  });

  it.each(pairs.filter(([signedIn, page]) => signedIn !== page))(
    "sends a %s on the %s pages back to their own home",
    async (signedIn, page) => {
      await actAs(EMAIL[signedIn]);
      expect(await redirectTarget(() => requirePageRole(page))).toBe(ROLE_HOME[signedIn]);
    },
  );

  it("treats a cookie that matches no session as a visitor", async () => {
    requestHeaders.current = new Headers({ cookie: "better-auth.session_token=stale.stale" });
    expect(await redirectTarget(() => requirePageRole("admiral"))).toBe("/login");
  });
});

describe("redirectIfSignedIn", () => {
  it("leaves a visitor on the login and sign-up pages", async () => {
    actAsNobody();
    expect(await redirectTarget(redirectIfSignedIn)).toBeNull();
  });

  it.each(ROLES)("sends a signed-in %s to their home", async (role) => {
    await actAs(EMAIL[role]);
    expect(await redirectTarget(redirectIfSignedIn)).toBe(ROLE_HOME[role]);
  });
});
