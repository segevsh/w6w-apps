import { assertEquals, assertRejects } from "@std/assert";
import batch from "../../actions/youtube-video-batch-start.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-video-batch-start: POSTs a channel source to /youtube/video/batch", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobId: "v1" } }]);
  assertEquals(await batch.execute({ channelId: "UC1", limit: 20 }, ctx), { jobId: "v1" });
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/video/batch");
  assertEquals(JSON.parse(calls[0].body!), { channelId: "UC1", limit: 20 });
});

Deno.test("youtube-video-batch-start: an array of ids passes through; no source is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobId: "v2" } }]);
  await batch.execute({ videoIds: ["a", "b"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { videoIds: ["a", "b"] });
  const none = mockCtx();
  await assertRejects(
    async () => await batch.execute({ videoIds: " " }, none.ctx),
    Error,
    "exactly one",
  );
  assertEquals(none.calls.length, 0);
});
