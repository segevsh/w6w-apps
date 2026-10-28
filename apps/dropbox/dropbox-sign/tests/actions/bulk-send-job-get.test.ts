import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-send-job-get.ts";

/** The requests a job produced are a paged collection inside the same response. */
Deno.test("bulk-send-job-get: returns the job and pages its requests", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { bulk_send_job: { bulk_send_job_id: "b1" }, signature_requests: [] } },
    {
      status: 200,
      body: { list_info: { num_pages: 1 }, signature_requests: [{ signature_request_id: "sr1" }] },
    },
  ]);
  const result = await action.execute!({ bulkSendJobId: "b1" }, ctx) as {
    bulk_send_job: { bulk_send_job_id: string };
    signature_requests: unknown[];
  };
  assertEquals(new URL(calls[0].url).pathname, "/v3/bulk_send_job/b1");
  assertEquals(result.bulk_send_job.bulk_send_job_id, "b1");
  assertEquals(result.signature_requests, [{ signature_request_id: "sr1" }]);
});

Deno.test("bulk-send-job-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`bulkSendJobId`");
  assertEquals(calls.length, 0);
});
