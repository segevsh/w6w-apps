import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-posts.ts";

Deno.test("list-posts: GETs /{pageId}/feed with fields", async () => {
  const body = { data: [{ id: "post-1", message: "hi" }], paging: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ pageId: "page-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/page-1/feed");
  assertEquals(url.searchParams.get("fields"), "id,message,created_time,permalink_url,full_picture");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-posts: forwards since/until/cursor/limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!(
    { pageId: "page-1", since: "1000", until: "2000", cursor: "abc", limit: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("since"), "1000");
  assertEquals(url.searchParams.get("until"), "2000");
  assertEquals(url.searchParams.get("after"), "abc");
  assertEquals(url.searchParams.get("limit"), "5");
});
