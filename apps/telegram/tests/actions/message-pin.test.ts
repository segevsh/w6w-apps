import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-pin.ts";

test("message-pin: POSTs pinChatMessage", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  assertEquals(await action.execute({ chatId: "1", messageId: 11 }, ctx), true);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", message_id: 11 });
});

test("message-pin: passes the silent flag through", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute({ chatId: "1", messageId: 11, disableNotification: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).disable_notification, true);
});
