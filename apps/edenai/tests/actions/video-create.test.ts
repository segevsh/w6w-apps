import { assertEquals } from "@std/assert";
import videoCreate from "../../actions/video-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-create: starts a job and reports it as not done", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "v1",
      status: "queued",
      progress: 0,
      model: "openai/sora-2",
      provider: "openai",
      cost: 0,
      created_at: 10,
    },
  }]);
  const out = await videoCreate.execute({
    model: "openai/sora-2",
    prompt: "a wave",
    seconds: 4,
    size: "1280x720",
    providerParams: '{"x":1}',
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/videos");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {
    model: "openai/sora-2",
    prompt: "a wave",
    seconds: 4,
    size: "1280x720",
    provider_params: { x: 1 },
  });
  assertEquals(out.id, "v1");
  assertEquals(out.status, "queued");
  assertEquals(out.done, false);
});
