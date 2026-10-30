import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-videos.ts";

test("list-videos: GETs /{pageId}/videos with fields", async () => {
  const body = { data: [{ id: "video-1" }], paging: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ pageId: "page-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/page-1/videos");
  assertEquals(
    url.searchParams.get("fields"),
    "id,description,created_time,permalink_url,length",
  );
  assertEquals(result, body);
});

test("list-videos: forwards cursor and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ pageId: "page-1", cursor: "abc", limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("after"), "abc");
  assertEquals(url.searchParams.get("limit"), "5");
});
