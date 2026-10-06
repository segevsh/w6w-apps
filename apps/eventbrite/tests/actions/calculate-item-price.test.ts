import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/calculate-item-price.ts";

Deno.test("calculate-item-price: posts scoped body", async () => {
  const { ctx, calls } = mockCtx([{ body: { item_pricing: {} } }]);
  const result = await action.execute!({
    basePrice: "USD,1000",
    country: "US",
    scopeType: "event",
    scopeIdentifier: "e1",
    absorbFees: true,
    channel: "web",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/pricing/calculate_price_for_item/");
  assertEquals(JSON.parse(calls[0].body!), {
    base_price: "USD,1000",
    country: "US",
    scope: { type: "event", identifier: "e1" },
    absorb_fees: true,
    channel: "web",
  });
  assertEquals(result, { item_pricing: {} });
});
