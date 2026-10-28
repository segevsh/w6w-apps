import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/message-post-chat.ts";

Deno.test("message-post-chat: posts to a chat", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "message_id": "1599387839188_229293271789" },
  }]);
  const out = await action.execute(
    { "chatId": "CT_1", "text": "Hi", "syncMessage": true } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats/CT_1/message");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "text": "Hi", "sync_message": true });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "success": true,
    "messageId": "1599387839188_229293271789",
    "response": { "message_id": "1599387839188_229293271789" },
  });
});

Deno.test("message-post-chat: idempotent is declared as false", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
