import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeTrain from "../../actions/knowledge-train.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = { "knowledgeId": "f1" };
const run = (
  ctx: Parameters<typeof knowledgeTrain.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeTrain.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-train: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeTrain.key, "knowledge-train");
  assertEquals(knowledgeTrain.type, "perform");
  assert((knowledgeTrain.description ?? "").length > 0);
  assert(Array.isArray(knowledgeTrain.output) && knowledgeTrain.output.length > 0);
  assertEquals(knowledgeTrain.idempotent, true);
});

Deno.test("knowledge-train: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "data": { "id": "f1", "type": "faq", "is_training": true, "trained_at": null },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "f1", "type": "faq", "is_training": true, "trained_at": null });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/f1/train");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-train: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
