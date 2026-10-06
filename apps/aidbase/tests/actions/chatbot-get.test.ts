import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotGet from "../../actions/chatbot-get.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1" };
const run = (
  ctx: Parameters<typeof chatbotGet.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotGet.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-get: declares a read action with a description, params and output", () => {
  assertEquals(chatbotGet.key, "chatbot-get");
  assertEquals(chatbotGet.type, "read");
  assert((chatbotGet.description ?? "").length > 0);
  assert(Array.isArray(chatbotGet.output) && chatbotGet.output.length > 0);
});

Deno.test("chatbot-get: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "id": "a1", "title": "T" } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "a1", "title": "T" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-get: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
