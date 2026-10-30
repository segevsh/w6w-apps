import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import commentList from "../../actions/comment-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("comment-list: GET /tasks/:task_id/comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 2, text: "Looks awesome!" }] }]);
  const out = await commentList.execute({ taskId: 123 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/123/comments");
  assertEquals(out, [{ id: 2, text: "Looks awesome!" }]);
});
