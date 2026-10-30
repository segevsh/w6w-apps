import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-document.ts";

const OK = { ok: true, result: { message_id: 1 } };

test("message-send-document: POSTs sendDocument with the chat and the media reference", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", document: "https://x/d.pdf" }, ctx);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendDocument");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", document: "https://x/d.pdf" });
});

test("message-send-document: sends the caption and parse mode when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", document: "https://x/d.pdf", caption: "look", parseMode: "HTML" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.caption, "look");
  assertEquals(body.parse_mode, "HTML");
});

test("message-send-document: passes its format-specific options through", async () => {
  const withExtras = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", document: "https://x/d.pdf", fileName: "report.pdf" },
    withExtras.ctx,
  );
  assertEquals(JSON.parse(withExtras.calls[0].body!).file_name, "report.pdf");
});
