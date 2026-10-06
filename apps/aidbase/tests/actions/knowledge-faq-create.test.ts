import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeFaqCreate from "../../actions/knowledge-faq-create.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "title": "General FAQ", "description": "General questions." };
const run = (
  ctx: Parameters<typeof knowledgeFaqCreate.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeFaqCreate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-faq-create: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeFaqCreate.key, "knowledge-faq-create");
  assertEquals(knowledgeFaqCreate.type, "perform");
  assert((knowledgeFaqCreate.description ?? "").length > 0);
  assert(Array.isArray(knowledgeFaqCreate.output) && knowledgeFaqCreate.output.length > 0);
  assertEquals(knowledgeFaqCreate.idempotent, false);
});

Deno.test("knowledge-faq-create: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": {
        "id": "f1",
        "type": "faq",
        "title": "General FAQ",
        "description": "General questions.",
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "id": "f1",
    "type": "faq",
    "title": "General FAQ",
    "description": "General questions.",
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/faq");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "title": "General FAQ",
    "description": "General questions.",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-faq-create: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
