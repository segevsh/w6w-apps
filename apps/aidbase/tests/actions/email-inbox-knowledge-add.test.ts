import { assert, assertEquals, assertRejects } from "@std/assert";
import emailInboxKnowledgeAdd from "../../actions/email-inbox-knowledge-add.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "p-1", "knowledgeId": "k1" };
const run = (
  ctx: Parameters<typeof emailInboxKnowledgeAdd.execute>[1],
  input: Record<string, unknown> = sample,
) => emailInboxKnowledgeAdd.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-inbox-knowledge-add: declares a perform action with a description, params and output", () => {
  assertEquals(emailInboxKnowledgeAdd.key, "email-inbox-knowledge-add");
  assertEquals(emailInboxKnowledgeAdd.type, "perform");
  assert((emailInboxKnowledgeAdd.description ?? "").length > 0);
  assert(Array.isArray(emailInboxKnowledgeAdd.output) && emailInboxKnowledgeAdd.output.length > 0);
  assertEquals(emailInboxKnowledgeAdd.idempotent, true);
});

Deno.test("email-inbox-knowledge-add: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/p-1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "knowledge_id": "k1" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-inbox-knowledge-add: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
