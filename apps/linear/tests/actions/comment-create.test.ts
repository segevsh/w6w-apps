import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-create.ts";

test("comment-create: sends the CommentCreate mutation", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { commentCreate: { success: true } } } }]);
  await action.execute({ issueId: "i1", body: "on it" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("mutation CommentCreate"), true);
  assertEquals(sent.variables.input, { issueId: "i1", body: "on it" });
});

test("comment-create: is not idempotent — a retry double-posts", () => {
  assertEquals(action.idempotent, false);
});
