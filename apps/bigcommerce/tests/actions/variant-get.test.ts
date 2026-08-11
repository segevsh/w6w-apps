import { assertEquals } from "@std/assert";
import variantGet from "../../actions/variant-get.ts";
import { mockCtx, pathOf, queryOf, v3Envelope } from "../_helpers.ts";

Deno.test("variant-get: addresses the variant UNDER its product", async () => {
  // There is no /v3/catalog/variants/{id} path.
  const { ctx, calls } = mockCtx([{ body: v3Envelope({ id: 9, sku: "MUG-1" }) }]);
  const out = await variantGet.execute({ productId: 77, variantId: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products/77/variants/9");
  assertEquals(out, { id: 9, sku: "MUG-1" });
});

Deno.test("variant-get: passes field selection through", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Envelope({}) }]);
  await variantGet.execute({ productId: 1, variantId: 2, includeFields: "sku,price" }, ctx);
  assertEquals(queryOf(calls[0].url), { include_fields: "sku,price" });
});
