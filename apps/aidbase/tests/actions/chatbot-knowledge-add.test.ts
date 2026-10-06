import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotKnowledgeAdd from "../../actions/chatbot-knowledge-add.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1", "knowledgeId": "k1" };
const run = (
  ctx: Parameters<typeof chatbotKnowledgeAdd.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotKnowledgeAdd.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-knowledge-add: declares a perform action with a description, params and output", () => {
  assertEquals(chatbotKnowledgeAdd.key, "chatbot-knowledge-add");
  assertEquals(chatbotKnowledgeAdd.type, "perform");
  assert((chatbotKnowledgeAdd.description ?? "").length > 0);
  assert(Array.isArray(chatbotKnowledgeAdd.output) && chatbotKnowledgeAdd.output.length > 0);
  assertEquals(chatbotKnowledgeAdd.idempotent, true);
});

Deno.test("chatbot-knowledge-add: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "knowledge_id": "k1" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-knowledge-add: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
