import { assertEquals, assertRejects } from "@std/assert";
import job from "../../actions/extract-job-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("extract-job-get: GETs /extract/{jobId} and returns status and data", async () => {
  const body = { status: "completed", data: { a: 1 }, schema: { type: "object" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await job.execute({ jobId: "e1" }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/extract/e1");
});

Deno.test("extract-job-get: a queued job passes through; a blank id makes no call", async () => {
  assertEquals(await job.execute({ jobId: "e" }, mockCtx([{ body: { status: "queued" } }]).ctx), {
    status: "queued",
  });
  const none = mockCtx();
  await assertRejects(async () => await job.execute({ jobId: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
