import { assertEquals } from "@std/assert";
import epicCommentList from "../../actions/epic-comment-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("epic-comment-list: calls GET /epics/{id}/comments", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, text: "hi" }] }]);
  await epicCommentList.execute({ epicId: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/epics/9/comments");
});
