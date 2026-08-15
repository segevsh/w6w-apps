import { assertEquals } from "@std/assert";
import upsellPricingGet from "../../actions/upsell-pricing-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("upsell-pricing-get: calls GET /upsells/{id}/pricing_options", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await upsellPricingGet.execute({ upsellId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/upsells/1/pricing_options");
});
