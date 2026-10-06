import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import messageSendToChat from "../../actions/message-send-to-chat.ts";

Deno.test("message-send-to-chat: posts text, file and reply to the chat", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "message_uid": "m1" } } }]);
  const out = await messageSendToChat.execute!(
    { "chatId": 9, "text": "hi", "fileUid": "f1", "replyTo": "m0" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/chats/9/messages");
  assertEquals(JSON.parse(calls[0].body!), { "text": "hi", "file_uid": "f1", "reply_to": "m0" });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("message-send-to-chat: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await messageSendToChat.execute!(
      { "chatId": 9, "text": "hi", "fileUid": "f1", "replyTo": "m0" } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});

Deno.test("message-send-to-chat: refuses a message with no content, before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await messageSendToChat.execute!({ chatId: 9 } as never, ctx);
  }, Error);
  assert(err.message.includes("text"), err.message);
  assertEquals(calls.length, 0);
});
