import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-cancel.ts";

Deno.test("job-cancel: POSTs the cancel endpoint and returns the job's state", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { job: { status: { state: "DONE" } } } }], {
    display: { projectId: "p1" },
  });
  const result = await action.execute!({ jobId: "j1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/jobs/j1/cancel");
  // Cancellation is a request, not a guarantee — read the returned state.
  assert(result.job !== undefined);
});

Deno.test("job-cancel: a blank job id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: { projectId: "p1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`jobId`");
  assertEquals(calls.length, 0);
});
