import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-photo.ts";

const OK = { ok: true, result: { message_id: 1 } };

Deno.test("message-send-photo: POSTs sendPhoto with the chat and the media reference", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", photo: "https://x/p.jpg" }, ctx);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendPhoto");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", photo: "https://x/p.jpg" });
});

Deno.test("message-send-photo: sends the caption and parse mode when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", photo: "https://x/p.jpg", caption: "look", parseMode: "HTML" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.caption, "look");
  assertEquals(body.parse_mode, "HTML");
});
