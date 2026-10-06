import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-inventory-tier.ts";

Deno.test("delete-inventory-tier: DELETEs the tier", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true } }]);
  const result = await action.execute!({ eventId: "e1", inventoryTierId: "t1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/v3/events/e1/inventory_tiers/t1/");
  assertEquals(result, { deleted: true });
});
