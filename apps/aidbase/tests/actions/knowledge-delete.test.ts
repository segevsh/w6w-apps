import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeDelete from "../../actions/knowledge-delete.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "knowledgeId": "k1" };
const run = (
  ctx: Parameters<typeof knowledgeDelete.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeDelete.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-delete: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeDelete.key, "knowledge-delete");
  assertEquals(knowledgeDelete.type, "perform");
  assert((knowledgeDelete.description ?? "").length > 0);
  assert(Array.isArray(knowledgeDelete.output) && knowledgeDelete.output.length > 0);
  assertEquals(knowledgeDelete.idempotent, true);
});

Deno.test("knowledge-delete: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": { "id": "k1", "type": "website", "base_url": "https://x.com/" },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "k1", "type": "website", "base_url": "https://x.com/" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/k1");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-delete: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
