import { assertEquals } from "@std/assert";
import commentList from "../../actions/workorder-comment-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("workorder-comment-list: GET /v1/workorders/{id}/comments with paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: { comments: [{ id: 1, authorId: 2, content: "hi", createdAt: "x" }], nextCursor: null },
  }]);
  const out = await commentList.execute({ workOrderId: 8, limit: 20, cursor: "k" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/workorders/8/comments");
  assertEquals(queryAll(calls[0].url), { limit: ["20"], cursor: ["k"] });
  assertEquals((out as { comments: unknown[] }).comments.length, 1);
  assertEquals((out as { nextCursor: unknown }).nextCursor, null);
});
