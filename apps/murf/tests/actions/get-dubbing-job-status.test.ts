import { assertEquals } from "@std/assert";
import action from "../../actions/get-dubbing-job-status.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("get-dubbing-job-status: GETs the job status and returns the body", async () => {
  const body = {
    job_id: "j 1",
    status: "COMPLETED",
    download_details: [{ locale: "fr_FR", status: "COMPLETED", download_url: "https://x/d" }],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { jobId: "j 1" }, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/murfdub/jobs/j%201/status");
  assertEquals(out, body);
});

Deno.test("get-dubbing-job-status: requires an id; a 404 fails", async () => {
  assertEquals((await failure(action, { jobId: "" }, mockCtx().ctx)).includes("jobId"), true);
  const { ctx } = mockCtx([{ status: 404, body: { error_message: "no job", error_code: 404 } }]);
  assertEquals((await failure(action, { jobId: "x" }, ctx)).includes("no job"), true);
});
