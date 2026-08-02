import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-comments.ts";

Deno.test("list-comments: GETs /{postId}/comments with fields and default order", async () => {
  const body = { data: [{ id: "c1", message: "nice" }], paging: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ postId: "post-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/post-1/comments");
  assertEquals(url.searchParams.get("fields"), "id,message,created_time,from");
  assertEquals(url.searchParams.get("order"), "chronological");
  assertEquals(result, body);
});

Deno.test("list-comments: honours order/cursor/limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!(
    { postId: "post-1", order: "reverse_chronological", cursor: "abc", limit: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("order"), "reverse_chronological");
  assertEquals(url.searchParams.get("after"), "abc");
  assertEquals(url.searchParams.get("limit"), "5");
});
