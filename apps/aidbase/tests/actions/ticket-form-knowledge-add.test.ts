import { assert, assertEquals, assertRejects } from "@std/assert";
import ticketFormKnowledgeAdd from "../../actions/ticket-form-knowledge-add.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "ticketFormId": "p-1", "knowledgeId": "k1" };
const run = (
  ctx: Parameters<typeof ticketFormKnowledgeAdd.execute>[1],
  input: Record<string, unknown> = sample,
) => ticketFormKnowledgeAdd.execute(input as never, ctx) as Promise<unknown>;

Deno.test("ticket-form-knowledge-add: declares a perform action with a description, params and output", () => {
  assertEquals(ticketFormKnowledgeAdd.key, "ticket-form-knowledge-add");
  assertEquals(ticketFormKnowledgeAdd.type, "perform");
  assert((ticketFormKnowledgeAdd.description ?? "").length > 0);
  assert(Array.isArray(ticketFormKnowledgeAdd.output) && ticketFormKnowledgeAdd.output.length > 0);
  assertEquals(ticketFormKnowledgeAdd.idempotent, true);
});

Deno.test("ticket-form-knowledge-add: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  const out = await run(ctx);
  assertEquals(out, { "ok": true });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/ticket-form/p-1/knowledge");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "knowledge_id": "k1" });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("ticket-form-knowledge-add: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
