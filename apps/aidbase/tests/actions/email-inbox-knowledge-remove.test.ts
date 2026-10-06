import { assert, assertEquals, assertRejects } from "@std/assert";
import emailInboxKnowledgeRemove from "../../actions/email-inbox-knowledge-remove.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "emailInboxId": "p-1", "knowledgeId": "k1" };
const run = (
  ctx: Parameters<typeof emailInboxKnowledgeRemove.execute>[1],
  input: Record<string, unknown> = sample,
) => emailInboxKnowledgeRemove.execute(input as never, ctx) as Promise<unknown>;

Deno.test("email-inbox-knowledge-remove: declares a perform action with a description, params and output", () => {
  assertEquals(emailInboxKnowledgeRemove.key, "email-inbox-knowledge-remove");
  assertEquals(emailInboxKnowledgeRemove.type, "perform");
  assert((emailInboxKnowledgeRemove.description ?? "").length > 0);
  assert(
    Array.isArray(emailInboxKnowledgeRemove.output) && emailInboxKnowledgeRemove.output.length > 0,
  );
  assertEquals(emailInboxKnowledgeRemove.idempotent, true);
});

Deno.test("email-inbox-knowledge-remove: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/email-inbox/p-1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "knowledge_id": "k1" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("email-inbox-knowledge-remove: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
