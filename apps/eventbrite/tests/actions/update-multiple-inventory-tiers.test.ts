import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-multiple-inventory-tiers.ts";

Deno.test("update-multiple-inventory-tiers: posts inventory_tiers array to collection path", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_tiers: [] } }]);
  const result = await action.execute!({ eventId: "e1", tiers: [{ id: "t1", name: "X" }] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/inventory_tiers/");
  assertEquals(JSON.parse(calls[0].body!), { inventory_tiers: [{ id: "t1", name: "X" }] });
  assertEquals(result, { inventory_tiers: [] });
});
