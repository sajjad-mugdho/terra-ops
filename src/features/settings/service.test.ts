import { beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "@/seed/reference";
import { actAs, actAsNobody } from "@/test/session";
import { listProducts } from "./service";

beforeAll(seedReference);

describe("listProducts", () => {
  it("throws UNAUTHORIZED without a session", async () => {
    actAsNobody();
    await expect(listProducts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each(["customer1@terra.demo", "manager.mars@terra.demo", "captain1@terra.demo"])(
    "gives %s the price but no making cost",
    async (email) => {
      await actAs(email);
      const products = await listProducts();

      expect(products.map((product) => product.name)).toEqual([
        "Food",
        "Machines",
        "Oxygen",
        "Plants",
        "Water",
      ]);
      for (const product of products) {
        expect(Object.keys(product).sort()).toEqual(["id", "name", "priceCents"]);
      }
      expect(products.find((product) => product.name === "Water")?.priceCents).toBe(1000);
    },
  );
});
