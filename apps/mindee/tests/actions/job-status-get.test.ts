import { assertEquals } from "@std/assert";
import jobStatusGet from "../../actions/job-status-get.ts";
import { jobResponse, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const JOB_ID = "018f1e2a-0000-7000-8000-000000000001";

Deno.test("job-status-get: always sends redirect=false so a Processed job answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: jobResponse({ status: "Processed" }) }]);
  const result = await jobStatusGet.execute({ jobId: JOB_ID }, ctx);

  assertEquals(pathOf(calls[0].url), `/v2/jobs/${JOB_ID}`);
  assertEquals(queryOf(calls[0].url), { redirect: "false" });
  assertEquals((result as { job: { status: string } }).job.status, "Processed");
});

Deno.test("job-status-get: reports a Failed job's error detail", async () => {
  const { ctx } = mockCtx([
    {
      body: jobResponse({
        status: "Failed",
        error: {
          status: 500,
          title: "Processing failed",
          detail: "OCR engine timed out",
          code: "500-001",
        },
      }),
    },
  ]);
  const result = await jobStatusGet.execute({ jobId: JOB_ID }, ctx);

  assertEquals(
    (result as { job: { status: string; error: { detail: string } } }).job.error.detail,
    "OCR engine timed out",
  );
});
