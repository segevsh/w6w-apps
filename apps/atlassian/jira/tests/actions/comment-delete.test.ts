import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/comment-delete.ts";

test("comment-delete: DELETEs the comment", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1", commentId: "9" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/rest/api/3/issue/ENG-1/comment/9");
});
