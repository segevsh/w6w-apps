import { assert, assertEquals, assertRejects } from "@std/assert";
import knowledgeVideoCreate from "../../actions/knowledge-video-create.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "videoUrl": "https://www.youtube.com/watch?v=EuXAQGoxLi8",
  "videoType": "YOUTUBE",
};
const run = (
  ctx: Parameters<typeof knowledgeVideoCreate.execute>[1],
  input: Record<string, unknown> = sample,
) => knowledgeVideoCreate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("knowledge-video-create: declares a perform action with a description, params and output", () => {
  assertEquals(knowledgeVideoCreate.key, "knowledge-video-create");
  assertEquals(knowledgeVideoCreate.type, "perform");
  assert((knowledgeVideoCreate.description ?? "").length > 0);
  assert(Array.isArray(knowledgeVideoCreate.output) && knowledgeVideoCreate.output.length > 0);
  assertEquals(knowledgeVideoCreate.idempotent, false);
});

Deno.test("knowledge-video-create: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "id": "v1", "type": "video", "video_id": "EuXAQGoxLi8" } },
  }]);
  const out = await run(ctx);
  assertEquals(out, { "id": "v1", "type": "video", "video_id": "EuXAQGoxLi8" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge/video");
  assertEquals(calls[0].url.startsWith("https://api.aidbase.ai/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "video_url": "https://www.youtube.com/watch?v=EuXAQGoxLi8",
    "video_type": "YOUTUBE",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("knowledge-video-create: an Aidbase failure body is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errBody("API key is missing a scope") }]);
  await assertRejects(() => run(ctx), Error, "API key is missing a scope");
});
