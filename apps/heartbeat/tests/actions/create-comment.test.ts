import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import createComment from "../../actions/create-comment.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("create-comment: parentCommentID defaults to explicit null, not omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await createComment.execute({ threadID: "t1", text: "<p>Hi</p>" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/comments");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.parentCommentID, null);
  assertEquals(body, { text: "<p>Hi</p>", threadID: "t1", parentCommentID: null });
});

test("create-comment: a reply to a comment sends the parent id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c2" } }]);
  await createComment.execute({ threadID: "t1", text: "<p>reply</p>", parentCommentID: "c1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.parentCommentID, "c1");
});

test("create-comment: is not idempotent", () => {
  assertEquals(createComment.idempotent, false);
});
