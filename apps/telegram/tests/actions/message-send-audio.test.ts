import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-audio.ts";

const OK = { ok: true, result: { message_id: 1 } };

Deno.test("message-send-audio: POSTs sendAudio with the chat and the media reference", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", audio: "https://x/a.mp3" }, ctx);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendAudio");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", audio: "https://x/a.mp3" });
});

Deno.test("message-send-audio: sends the caption and parse mode when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", audio: "https://x/a.mp3", caption: "look", parseMode: "HTML" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.caption, "look");
  assertEquals(body.parse_mode, "HTML");
});

Deno.test("message-send-audio: passes its format-specific options through", async () => {
  const withExtras = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", audio: "https://x/a.mp3", performer: "Acme" },
    withExtras.ctx,
  );
  assertEquals(JSON.parse(withExtras.calls[0].body!).performer, "Acme");
});
