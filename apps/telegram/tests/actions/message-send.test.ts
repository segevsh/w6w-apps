import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send.ts";

const OK = { ok: true, result: { message_id: 11, chat: { id: 1 } } };

Deno.test("message-send: POSTs sendMessage with the text and chat", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await action.execute({ chatId: "@acme", text: "hi" }, ctx);
  assertEquals(out, OK.result);
  assertEquals(calls[0].url, "https://api.telegram.org/bot%7Btoken%7D/sendMessage");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "@acme", text: "hi" });
});

Deno.test("message-send: omits every option the user left blank", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", text: "hi", parseMode: "" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body).sort(), ["chat_id", "text"]);
});

Deno.test("message-send: maps the delivery options onto Bot API field names", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({
    chatId: "1",
    text: "hi",
    parseMode: "HTML",
    disableWebPagePreview: true,
    replyToMessageId: 5,
    messageThreadId: 9,
    disableNotification: true,
    protectContent: true,
    replyMarkup: { inline_keyboard: [] },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    chat_id: "1",
    text: "hi",
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_parameters: { message_id: 5 },
    message_thread_id: 9,
    disable_notification: true,
    protect_content: true,
    reply_markup: { inline_keyboard: [] },
  });
});

Deno.test("message-send: is a non-idempotent perform (a retry posts twice)", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(action.params?.some((p) => p.key === "text" && p.required));
});
