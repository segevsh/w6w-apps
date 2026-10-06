import { assertEquals, assertRejects } from "@std/assert";
import batch from "../../actions/youtube-transcript-batch-start.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-transcript-batch-start: POSTs a video list (one per line) with lang and text", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobId: "b1" } }]);
  const out = await batch.execute({ videoIds: "a\n b ,c", lang: "en", text: true }, ctx);
  assertEquals(out, { jobId: "b1" });
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/transcript/batch");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { videoIds: ["a", "b", "c"], lang: "en", text: true });
});

Deno.test("youtube-transcript-batch-start: a playlist source carries its limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobId: "b2" } }]);
  await batch.execute({ playlistId: "PL1", limit: 25 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { playlistId: "PL1", limit: 25 });
});

Deno.test("youtube-transcript-batch-start: zero or several sources are refused before any call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await batch.execute({}, ctx), Error, "exactly one");
  await assertRejects(
    async () => await batch.execute({ videoIds: "a", channelId: "c" }, ctx),
    Error,
    "exactly one",
  );
  assertEquals(calls.length, 0);
});
