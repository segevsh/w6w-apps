import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-seat-map.ts";

test("create-seat-map: posts source_seatmap_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { event_id: "e1" } }]);
  const result = await action.execute!({ eventId: "e1", sourceSeatmapId: "E1-m1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/seatmaps/");
  assertEquals(JSON.parse(calls[0].body!), { source_seatmap_id: "E1-m1" });
  assertEquals(result, { event_id: "e1" });
});
