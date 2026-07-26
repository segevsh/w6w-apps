import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-delete.ts";

Deno.test("message-delete: POSTs deleteMessage and returns the boolean result", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  const out = await action.execute({ chatId: "1", messageId: 11 }, ctx);
  assertEquals(out, true);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/deleteMessage");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", message_id: 11 });
});
