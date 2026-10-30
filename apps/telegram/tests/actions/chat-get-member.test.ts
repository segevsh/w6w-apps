import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-get-member.ts";

test("chat-get-member: GETs getChatMember with both ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: { status: "member" } } }]);
  await action.execute({ chatId: "1", userId: 42 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("chat_id"), "1");
  assertEquals(q.get("user_id"), "42");
});
