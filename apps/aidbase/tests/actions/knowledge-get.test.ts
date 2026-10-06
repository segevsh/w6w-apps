import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeGet from "../../actions/knowledge-get.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "knowledgeId": "k 1" };
const run = (
  ctx: Parameters<typeof knowledgeGet.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeGet.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-get: declares a read action with a description, params and output", () => {
  assertEquals(knowledgeGet.key, "knowledge-get");
  assertEquals(knowledgeGet.type, "read");
  assert((knowledgeGet.description ?? "").length > 0);
  assert(Array.isArray(knowledgeGet.output) && knowledgeGet.output.length > 0);
});

Deno.test("knowledge-get: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "id": "k 1", "type": "website", "is_training": false } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "k 1", "type": "website", "is_training": false });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/k%201");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-get: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
