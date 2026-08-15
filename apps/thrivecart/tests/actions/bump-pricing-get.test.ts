import { assertEquals } from "@std/assert";
import bumpPricingGet from "../../actions/bump-pricing-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bump-pricing-get: calls GET /bumps/{id}/pricing_options", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await bumpPricingGet.execute({ bumpId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/bumps/1/pricing_options");
});
