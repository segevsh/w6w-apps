import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import commentList from "../../actions/comment-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

test("comment-list: calls GET /v1/comments for one task", async () => {
  const { ctx, calls } = mockCtx([
    { body: page("comments", [{ id: "c1", taskId: "t1", content: "<p>hi</p>" }]) },
  ]);
  const out = await commentList.execute({ taskId: "t1", cursor: "c0" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/comments");
  assertEquals(queryOf(calls[0].url), { taskId: "t1", cursor: "c0" });
  assertEquals(out, {
    items: [{ id: "c1", taskId: "t1", content: "<p>hi</p>" }],
    meta: { pageSize: 1 },
  });
});

/** Motion has no endpoint for listing comments across tasks. */
test("comment-list: taskId is required", () => {
  assertEquals(commentList.params?.find((p) => p.key === "taskId")?.required, true);
});
