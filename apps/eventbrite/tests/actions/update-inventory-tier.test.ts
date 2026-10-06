import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-inventory-tier.ts";

Deno.test("update-inventory-tier: posts partial body to tier path", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_tier: { id: "t1" } } }]);
  const result = await action.execute!({
    eventId: "e1",
    inventoryTierId: "t1",
    name: "New",
    capacityTotal: 100,
    holds: [{ id: "I1", is_deleted: true }],
    extra: { color: "#fff" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/inventory_tiers/t1/");
  assertEquals(JSON.parse(calls[0].body!), {
    inventory_tier: {
      name: "New",
      capacity_total: 100,
      holds: [{ id: "I1", is_deleted: true }],
      color: "#fff",
    },
  });
  assertEquals(result, { inventory_tier: { id: "t1" } });
});
