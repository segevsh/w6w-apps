import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-fee-rates.ts";

Deno.test("list-fee-rates: passes filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { fee_rates: [], pagination: {} } }]);
  const result = await action.execute!({
    country: "US",
    currency: "USD",
    plan: "package1",
    paymentType: "any",
    itemType: "ticket",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/pricing/fee_rates");
  assertEquals(url.searchParams.get("country"), "US");
  assertEquals(url.searchParams.get("currency"), "USD");
  assertEquals(url.searchParams.get("plan"), "package1");
  assertEquals(url.searchParams.get("item_type"), "ticket");
  assertEquals(result, { fee_rates: [], pagination: {} });
});
