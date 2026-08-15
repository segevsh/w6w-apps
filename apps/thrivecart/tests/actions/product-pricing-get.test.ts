import { assertEquals } from "@std/assert";
import productPricingGet from "../../actions/product-pricing-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-pricing-get: calls GET /products/{id}/pricing_options with affiliate_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { plans: [] } }]);
  await productPricingGet.execute({ productId: "1", affiliateId: "aff_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/products/1/pricing_options");
  assertEquals(new URL(calls[0].url).searchParams.get("affiliate_id"), "aff_1");
});

Deno.test("product-pricing-get: affiliate_id is omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await productPricingGet.execute({ productId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("affiliate_id"), false);
});
