import { assertEquals } from "@std/assert";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/product-get.ts";

Deno.test("product-get: GETs /products/{id}.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { product: { id: 5 } } }]);
  await action.execute({ productId: 5 }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.myshopify.com/admin/api/2024-07/products/5.json",
  );
});
