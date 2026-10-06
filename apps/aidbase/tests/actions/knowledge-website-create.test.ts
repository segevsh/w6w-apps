import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeWebsiteCreate from "../../actions/knowledge-website-create.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "websiteUrl": "https://example.com" };
const run = (
  ctx: Parameters<typeof knowledgeWebsiteCreate.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeWebsiteCreate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-website-create: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeWebsiteCreate.key, "knowledge-website-create");
  assertEquals(knowledgeWebsiteCreate.type, "perform");
  assert((knowledgeWebsiteCreate.description ?? "").length > 0);
  assert(Array.isArray(knowledgeWebsiteCreate.output) && knowledgeWebsiteCreate.output.length > 0);
  assertEquals(knowledgeWebsiteCreate.idempotent, false);
});

Deno.test("knowledge-website-create: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": { "id": "k9", "type": "website", "base_url": "https://example.com" },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "k9", "type": "website", "base_url": "https://example.com" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/website");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "website_url": "https://example.com",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-website-create: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
