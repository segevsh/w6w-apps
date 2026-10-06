import { assertEquals } from "@std/assert";
import rowCommentList from "../../actions/row-comment-list.ts";
import { BASE_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("row-comment-list: GETs /comments/ for a row and wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 1, comment: "Good" }, { id: 2, comment: "Yes" }],
  }]);
  const out = await rowCommentList.execute({ rowId: "r1" }, ctx) as { comments: unknown[] };
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/comments/`);
  assertEquals(queryOf(calls[0].url), { row_id: "r1" });
  assertEquals(out.comments.length, 2);
});

Deno.test("row-comment-list: a non-array answer yields an empty list, not a crash", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await rowCommentList.execute({ rowId: "r1" }, ctx) as { comments: unknown[] };
  assertEquals(out.comments, []);
});
