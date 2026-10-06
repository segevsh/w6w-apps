import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-inventory-tier.ts";

Deno.test("get-inventory-tier: GETs the tier", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_tier: { id: "t1" } } }]);
  const result = await action.execute!({ eventId: "e1", inventoryTierId: "t/1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/e1/inventory_tiers/t%2F1/");
  assertEquals(result, { inventory_tier: { id: "t1" } });
});
