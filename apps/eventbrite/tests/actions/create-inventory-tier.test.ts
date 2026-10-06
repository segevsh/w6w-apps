import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-inventory-tier.ts";

Deno.test("create-inventory-tier: wraps body in inventory_tier", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_tier: { id: "t1" } } }]);
  const result = await action.execute!({
    eventId: "e1",
    name: "VIP",
    seatmapNumber: 0,
    quantityTotal: 30,
    countAgainstEventCapacity: true,
    capacityTotal: 40,
    holds: [{ name: "Press", quantity_total: 10 }],
    extra: { color: "#000000" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/inventory_tiers/");
  assertEquals(JSON.parse(calls[0].body!), {
    inventory_tier: {
      name: "VIP",
      seatmap_number: 0,
      quantity_total: 30,
      capacity_total: 40,
      count_against_event_capacity: true,
      holds: [{ name: "Press", quantity_total: 10 }],
      color: "#000000",
    },
  });
  assertEquals(result, { inventory_tier: { id: "t1" } });
});
