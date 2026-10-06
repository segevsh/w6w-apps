import { assertEquals, assertRejects } from "@std/assert";
import batch from "../../actions/youtube-batch-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-batch-get: GETs /youtube/batch/{jobId} with limit and offset 0", async () => {
  const body = {
    status: "completed",
    results: [{ videoId: "a" }],
    stats: { total: 1, succeeded: 1, failed: 0 },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await batch.execute({ jobId: "b1", limit: 50, offset: 0 }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/batch/b1?limit=50&offset=0");
});

Deno.test("youtube-batch-get: an expired job is returned as data; a blank id makes no call", async () => {
  const body = {
    status: "failed",
    errorCode: "job-expired",
    results: [],
    stats: { total: 0, succeeded: 0, failed: 0 },
  };
  assertEquals(await batch.execute({ jobId: "b" }, mockCtx([{ body }]).ctx), body);
  const none = mockCtx();
  await assertRejects(async () => await batch.execute({ jobId: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
