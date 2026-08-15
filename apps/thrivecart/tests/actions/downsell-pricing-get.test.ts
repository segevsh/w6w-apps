import { assertEquals } from "@std/assert";
import downsellPricingGet from "../../actions/downsell-pricing-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("downsell-pricing-get: calls GET /downsells/{id}/pricing_options", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await downsellPricingGet.execute({ downsellId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/downsells/1/pricing_options");
});
