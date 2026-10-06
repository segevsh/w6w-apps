import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-prediction-job-list.ts";

const display = { projectId: "p1", location: "us-central1" };

Deno.test("batch-prediction-job-list: paginates and passes the filter", async () => {
  const { ctx, calls } = mockCtx([
    { body: { batchPredictionJobs: [{ name: "a" }], nextPageToken: "t" } },
    { body: { batchPredictionJobs: [{ name: "b" }] } },
  ], { display });
  const out = await action.execute!({ returnAll: true, filter: 'state="JOB_STATE_RUNNING"' }, ctx);
  assertEquals(out, { items: [{ name: "a" }, { name: "b" }], nextPageToken: undefined });
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/v1/projects/p1/locations/us-central1/batchPredictionJobs");
  assertEquals(u.searchParams.get("filter"), 'state="JOB_STATE_RUNNING"');
  assert(calls[1].url.includes("pageToken=t"));
});

Deno.test("batch-prediction-job-list: an API error carries Google's status", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { status: "PERMISSION_DENIED", message: "no" } },
  }], { display });
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "PERMISSION_DENIED");
});
