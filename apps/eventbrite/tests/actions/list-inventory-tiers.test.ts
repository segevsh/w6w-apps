import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-inventory-tiers.ts";

Deno.test("list-inventory-tiers: passes filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_tiers: [], pagination: {} } }]);
  const result = await action.execute!({
    eventId: "e1",
    seatmapNumber: 0,
    countAgainstEventCapacity: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/e1/inventory_tiers/");
  assertEquals(url.searchParams.get("seatmap_number"), "0");
  assertEquals(url.searchParams.get("count_against_event_capacity"), "false");
  assertEquals(result, { inventory_tiers: [], pagination: {} });
});
