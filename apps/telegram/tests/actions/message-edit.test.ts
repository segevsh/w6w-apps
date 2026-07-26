import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-edit.ts";

const OK = { ok: true, result: { message_id: 11 } };

Deno.test("message-edit: addresses a chat message by chat + message id", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ chatId: "1", messageId: 11, text: "new" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", message_id: 11, text: "new" });
});

Deno.test("message-edit: an inline message id replaces the chat/message pair", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { chatId: "1", messageId: 11, inlineMessageId: "inline-1", text: "new" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.inline_message_id, "inline-1");
  assertEquals("chat_id" in body, false);
  assertEquals("message_id" in body, false);
});

Deno.test("message-edit: rejects an incomplete target before making a request", () => {
  const { ctx, calls } = mockCtx();
  // Thrown synchronously, before any request is built — the runtime awaits
  // `execute`, so a sync throw surfaces as a failed invocation either way.
  assertThrows(
    () => action.execute({ chatId: "1", text: "new" }, ctx),
    Error,
    "Provide either `inlineMessageId`, or both `chatId` and `messageId`.",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-edit: is idempotent — re-editing converges on the same text", () => {
  assertEquals(action.idempotent, true);
});
