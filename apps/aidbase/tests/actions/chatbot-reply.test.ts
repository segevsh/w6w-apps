import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotReply from "../../actions/chatbot-reply.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1", "message": "Hi", "sessionId": "s1" };
const run = (
  ctx: Parameters<typeof chatbotReply.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotReply.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-reply: declares a perform action with a description, params and output", () => {
  assertEquals(chatbotReply.key, "chatbot-reply");
  assertEquals(chatbotReply.type, "perform");
  assert((chatbotReply.description ?? "").length > 0);
  assert(Array.isArray(chatbotReply.output) && chatbotReply.output.length > 0);
  assertEquals(chatbotReply.idempotent, false);
});

Deno.test("chatbot-reply: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "id": "m1", "session_id": "s1", "message": "Hello!" } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "m1", "session_id": "s1", "message": "Hello!" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1/reply");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "message": "Hi",
    "session_id": "s1",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-reply: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
