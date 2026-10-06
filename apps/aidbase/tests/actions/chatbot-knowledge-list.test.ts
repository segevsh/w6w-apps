import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotKnowledgeList from "../../actions/chatbot-knowledge-list.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1" };
const run = (
  ctx: Parameters<typeof chatbotKnowledgeList.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotKnowledgeList.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-knowledge-list: declares a read action with a description, params and output", () => {
  assertEquals(chatbotKnowledgeList.key, "chatbot-knowledge-list");
  assertEquals(chatbotKnowledgeList.type, "read");
  assert((chatbotKnowledgeList.description ?? "").length > 0);
  assert(Array.isArray(chatbotKnowledgeList.output) && chatbotKnowledgeList.output.length > 0);
});

Deno.test("chatbot-knowledge-list: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "items": [{ "id": "k1" }], "total": 1, "has_more": false } },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [{ "id": "k1" }],
    "total": 1,
    "hasMore": false,
    "nextCursor": null,
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-knowledge-list: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
