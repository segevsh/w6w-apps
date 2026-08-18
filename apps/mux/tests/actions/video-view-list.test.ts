import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/video-view-list.ts";

Deno.test("video-view-list: reads individual sessions from the Data API", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "v1" }] } }]);
  const out = await action.execute!({ filters: "asset_id:a1" }, ctx) as { views: unknown[] };
  assertEquals(out.views.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/data/v1/video-views");
  assertEquals(url.searchParams.get("filters[0]"), "asset_id:a1");
});

/** The record behind "it would not play for me". */
Deno.test("video-view-list: frames itself as the support tool", () => {
  assert(/would not/.test(action.description!), action.description);
});
