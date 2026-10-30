import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/conversation-get.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

test("conversation-get: unwraps Missive's documented one-element array", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [{ id: "c1", subject: "Hi" }] } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations/c1");
  assertEquals(out, { id: "c1", subject: "Hi" });
});

test("conversation-get: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
