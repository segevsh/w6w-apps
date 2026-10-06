import { assertEquals, assertRejects } from "@std/assert";
import job from "../../actions/transcript-job-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("transcript-job-get: GETs /transcript/{jobId} and returns the job document", async () => {
  const body = { status: "completed", content: "hello", lang: "en", availableLangs: ["en"] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await job.execute({ jobId: "a/b c" }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/transcript/a%2Fb%20c");
  assertEquals(calls[0].method, "GET");
});

Deno.test("transcript-job-get: a failed job is returned with its error; an HTTP 404 is thrown", async () => {
  const failed = {
    status: "failed",
    error: { error: "internal-error", message: "m", details: "d" },
  };
  assertEquals(await job.execute({ jobId: "j" }, mockCtx([{ body: failed }]).ctx), failed);
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "not-found", message: "Not Found", details: "No job" },
  }]);
  await assertRejects(
    async () => await job.execute({ jobId: "j" }, ctx),
    Error,
    "not-found: No job",
  );
});
