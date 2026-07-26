import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-sticker.ts";

Deno.test("message-send-sticker: POSTs sendSticker", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: { message_id: 1 } } }]);
  await action.execute({ chatId: "1", sticker: "CAACAgIA" }, ctx);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendSticker");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", sticker: "CAACAgIA" });
});
