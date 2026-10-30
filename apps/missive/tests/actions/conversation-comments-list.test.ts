import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/conversation-comments-list.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

test("conversation-comments-list: lists comments for a conversation", async () => {
  const { ctx, calls } = mockCtx([{ body: { comments: [{ id: "cm1" }] } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations/c1/comments");
  assertEquals(out, [{ id: "cm1" }]);
});

test("conversation-comments-list: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
