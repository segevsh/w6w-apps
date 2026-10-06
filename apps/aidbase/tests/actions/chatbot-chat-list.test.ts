import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotChatList from "../../actions/chatbot-chat-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1", "createdAfter": "2026-01-01" };
const run = (
  ctx: Parameters<typeof chatbotChatList.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotChatList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-chat-list: declares a read action with a description, params and output", () => {
  assertEquals(chatbotChatList.key, "chatbot-chat-list");
  assertEquals(chatbotChatList.type, "read");
  assert((chatbotChatList.description ?? "").length > 0);
  assert(Array.isArray(chatbotChatList.output) && chatbotChatList.output.length > 0);
});

Deno.test("chatbot-chat-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "id": "c1", "session_id": "s1" }],
        "total": 150,
        "has_more": true,
        "next_cursor": "n",
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "id": "c1", "session_id": "s1" }],
    "total": 150,
    "hasMore": true,
    "nextCursor": "n",
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1/chats");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), { "created_after": "2026-01-01" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-chat-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
