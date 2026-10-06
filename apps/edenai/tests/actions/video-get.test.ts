import { assertEquals } from "@std/assert";
import videoGet from "../../actions/video-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-get: a completed job is done with its settled cost", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "v1",
      status: "completed",
      progress: 100,
      model: "openai/sora-2",
      provider: "openai",
      cost: 1.2,
      created_at: 10,
      completed_at: 20,
    },
  }]);
  const out = await videoGet.execute({ videoId: "v1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/videos/v1");
  assertEquals(out.done, true);
  assertEquals(out.cost, 1.2);
  assertEquals(out.completedAt, 20);
});

Deno.test("video-get: a failed job is done and carries its error", async () => {
  const { ctx } = mockCtx([{
    body: { id: "v2", status: "failed", error: { code: "policy", message: "blocked" }, cost: 0 },
  }]);
  const out = await videoGet.execute({ videoId: "v2" }, ctx) as Record<string, unknown>;
  assertEquals(out.done, true);
  assertEquals(out.error, { code: "policy", message: "blocked" });
});

Deno.test("video-get: an in-progress job is not done", async () => {
  const { ctx } = mockCtx([{ body: { id: "v3", status: "in_progress", progress: 40 } }]);
  const out = await videoGet.execute({ videoId: "v3" }, ctx) as Record<string, unknown>;
  assertEquals(out.done, false);
  assertEquals(out.progress, 40);
});

Deno.test("video-get: the id is path-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await videoGet.execute({ videoId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/videos/a%2Fb");
});
