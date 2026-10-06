import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeFaqItemCreate from "../../actions/knowledge-faq-item-create.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "knowledgeId": "f1",
  "question": "Price?",
  "answer": "See pricing.",
  "sourceUrl": "https://example.com/pricing",
  "categories": "General, Pricing",
};
const run = (
  ctx: Parameters<typeof knowledgeFaqItemCreate.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeFaqItemCreate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-faq-item-create: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeFaqItemCreate.key, "knowledge-faq-item-create");
  assertEquals(knowledgeFaqItemCreate.type, "perform");
  assert((knowledgeFaqItemCreate.description ?? "").length > 0);
  assert(Array.isArray(knowledgeFaqItemCreate.output) && knowledgeFaqItemCreate.output.length > 0);
  assertEquals(knowledgeFaqItemCreate.idempotent, false);
});

Deno.test("knowledge-faq-item-create: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": { "id": "q9", "question": "Price?", "categories": ["Pricing", "General"] },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "q9", "question": "Price?", "categories": ["Pricing", "General"] });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/f1/faq-item");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "question": "Price?",
    "answer": "See pricing.",
    "source_url": "https://example.com/pricing",
    "categories": ["General", "Pricing"],
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-faq-item-create: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
