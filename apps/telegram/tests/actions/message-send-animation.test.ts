import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-animation.ts";

const OK = { ok: true, result: { message_id: 1 } };

Deno.test("message-send-animation: POSTs sendAnimation with the chat and the media reference", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", animation: "https://x/a.gif" }, ctx);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendAnimation");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", animation: "https://x/a.gif" });
});

Deno.test("message-send-animation: sends the caption and parse mode when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", animation: "https://x/a.gif", caption: "look", parseMode: "HTML" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.caption, "look");
  assertEquals(body.parse_mode, "HTML");
});

Deno.test("message-send-animation: passes its format-specific options through", async () => {
  const withExtras = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", animation: "https://x/a.gif", duration: 3 }, withExtras.ctx);
  assertEquals(JSON.parse(withExtras.calls[0].body!).duration, 3);
});
