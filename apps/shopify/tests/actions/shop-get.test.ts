import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/shop-get.ts";

test("shop-get: GETs /shop.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { shop: { name: "Acme" } } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.myshopify.com/admin/api/2024-07/shop.json");
});
