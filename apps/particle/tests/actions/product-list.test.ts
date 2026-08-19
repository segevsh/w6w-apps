import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-list.ts";

const products = {
  status: 200,
  body: {
    products: [
      { id: 1234, slug: "sensors", name: "Sensors", platform_id: 13 },
      { id: 5678, slug: "gateways", name: "Gateways", platform_id: 32 },
    ],
  },
};

Deno.test("product-list: reads the products endpoint", async () => {
  const { ctx, calls } = mockCtx([products]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.particle.io/v1/products");
  assertEquals(result.count, 2);
  assertEquals(result.ids, [1234, 5678]);
  assertEquals(result.slugs, ["sensors", "gateways"]);
});

/** Firmware is platform-specific, and the product is where that lives. */
Deno.test("product-list: reports the distinct platforms", async () => {
  const { ctx } = mockCtx([products]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.platforms, [13, 32]);
});

/** Product devices and account devices are different lists. */
Deno.test("product-list: says an automation pointed at the wrong list sees nothing", () => {
  assert(
    /different list from an account's claimed devices/.test(action.description!),
    action.description,
  );
  assert(/sees nothing and reports no error/.test(action.description!), action.description);
  assertEquals(action.params, []);
});

Deno.test("product-list: no products is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { products: [] } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.platforms, []);
});
