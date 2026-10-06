import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotChatGet from "../../actions/chatbot-chat-get.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1", "chatId": "c1" };
const run = (
  ctx: Parameters<typeof chatbotChatGet.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotChatGet.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-chat-get: declares a read action with a description, params and output", () => {
  assertEquals(chatbotChatGet.key, "chatbot-chat-get");
  assertEquals(chatbotChatGet.type, "read");
  assert((chatbotChatGet.description ?? "").length > 0);
  assert(Array.isArray(chatbotChatGet.output) && chatbotChatGet.output.length > 0);
});

Deno.test("chatbot-chat-get: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": { "id": "c1", "conversation": [{ "role": "user", "message": "Hi" }] },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "c1", "conversation": [{ "role": "user", "message": "Hi" }] });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1/chats/c1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-chat-get: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
