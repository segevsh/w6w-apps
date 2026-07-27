import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-get-many.ts";

Deno.test("comment-get-many: GETs /{resource}/{id}/comment with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { comments: [] } }]);
  await action.execute!({ commentsOn: "task", id: "t1", start: 1700000000000, startId: "c9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/task/t1/comment");
  assertEquals(url.searchParams.get("start"), "1700000000000");
  assertEquals(url.searchParams.get("start_id"), "c9");
});
