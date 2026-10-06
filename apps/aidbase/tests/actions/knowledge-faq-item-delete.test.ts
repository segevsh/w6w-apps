import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeFaqItemDelete from "../../actions/knowledge-faq-item-delete.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "knowledgeId": "f1", "faqItemId": "q1" };
const run = (
  ctx: Parameters<typeof knowledgeFaqItemDelete.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeFaqItemDelete.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-faq-item-delete: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeFaqItemDelete.key, "knowledge-faq-item-delete");
  assertEquals(knowledgeFaqItemDelete.type, "perform");
  assert((knowledgeFaqItemDelete.description ?? "").length > 0);
  assert(Array.isArray(knowledgeFaqItemDelete.output) && knowledgeFaqItemDelete.output.length > 0);
  assertEquals(knowledgeFaqItemDelete.idempotent, true);
});

Deno.test("knowledge-faq-item-delete: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "id": "q1", "question": "Price?" } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "q1", "question": "Price?" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/f1/faq-item/q1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-faq-item-delete: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
