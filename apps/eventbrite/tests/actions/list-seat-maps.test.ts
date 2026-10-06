import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-seat-maps.ts";

Deno.test("list-seat-maps: passes venue filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { seatmaps: [] } }]);
  const result = await action.execute!({
    organizationId: "o1",
    venueId: "v1",
    venueNameFilter: "Hall",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/organizations/o1/seatmaps/");
  assertEquals(url.searchParams.get("venue_id"), "v1");
  assertEquals(url.searchParams.get("venue_name_filter"), "Hall");
  assertEquals(result, { seatmaps: [] });
});
