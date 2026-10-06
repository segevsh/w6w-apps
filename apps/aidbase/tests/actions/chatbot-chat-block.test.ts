import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotChatBlock from "../../actions/chatbot-chat-block.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1", "chatId": "c1" };
const run = (
  ctx: Parameters<typeof chatbotChatBlock.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotChatBlock.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-chat-block: declares a perform action with a description, params and output", () => {
  assertEquals(chatbotChatBlock.key, "chatbot-chat-block");
  assertEquals(chatbotChatBlock.type, "perform");
  assert((chatbotChatBlock.description ?? "").length > 0);
  assert(Array.isArray(chatbotChatBlock.output) && chatbotChatBlock.output.length > 0);
  assertEquals(chatbotChatBlock.idempotent, true);
});

Deno.test("chatbot-chat-block: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "items": [{ "target": "c1", "targetType": "CHAT", "status": "ACTIVE" }],
        "failed": [],
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "target": "c1", "targetType": "CHAT", "status": "ACTIVE" }],
    "failed": [],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1/chats/c1/block");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-chat-block: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
