import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-video.ts";

const OK = { ok: true, result: { message_id: 1 } };

test("message-send-video: POSTs sendVideo with the chat and the media reference", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", video: "https://x/v.mp4" }, ctx);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendVideo");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", video: "https://x/v.mp4" });
});

test("message-send-video: sends the caption and parse mode when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", video: "https://x/v.mp4", caption: "look", parseMode: "HTML" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.caption, "look");
  assertEquals(body.parse_mode, "HTML");
});

test("message-send-video: passes its format-specific options through", async () => {
  const withExtras = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", video: "https://x/v.mp4", supportsStreaming: true },
    withExtras.ctx,
  );
  assertEquals(JSON.parse(withExtras.calls[0].body!).supports_streaming, true);
});
