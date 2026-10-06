import { assert, assertEquals, assertRejects } from "@std/assert";
import chatbotKnowledgeRemove from "../../actions/chatbot-knowledge-remove.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "chatbotId": "p-1", "knowledgeId": "k1" };
const run = (
  ctx: Parameters<typeof chatbotKnowledgeRemove.execute>[1],
  input: Record<string, unknown> = sample,
) => chatbotKnowledgeRemove.execute(input as never, ctx) as Promise<unknown>;

Deno.test("chatbot-knowledge-remove: declares a perform action with a description, params and output", () => {
  assertEquals(chatbotKnowledgeRemove.key, "chatbot-knowledge-remove");
  assertEquals(chatbotKnowledgeRemove.type, "perform");
  assert((chatbotKnowledgeRemove.description ?? "").length > 0);
  assert(Array.isArray(chatbotKnowledgeRemove.output) && chatbotKnowledgeRemove.output.length > 0);
  assertEquals(chatbotKnowledgeRemove.idempotent, true);
});

Deno.test("chatbot-knowledge-remove: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/chatbot/p-1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "knowledge_id": "k1" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("chatbot-knowledge-remove: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
