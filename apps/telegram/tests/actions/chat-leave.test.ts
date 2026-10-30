import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-leave.ts";

test("chat-leave: POSTs leaveChat", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  assertEquals(await action.execute({ chatId: "1" }, ctx), true);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1" });
});
