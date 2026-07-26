import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-pin.ts";

Deno.test("message-pin: POSTs pinChatMessage", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  assertEquals(await action.execute({ chatId: "1", messageId: 11 }, ctx), true);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", message_id: 11 });
});

Deno.test("message-pin: passes the silent flag through", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute({ chatId: "1", messageId: 11, disableNotification: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).disable_notification, true);
});
