import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import jobGet from "../../actions/batch-prediction-job-get.ts";
import jobList from "../../actions/batch-prediction-job-list.ts";
import jobCancel from "../../actions/batch-prediction-job-cancel.ts";

const display = { projectId: "p1", location: "us-central1" };
const BASE = "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/us-central1";

Deno.test("batch-prediction-job-get / -list / -cancel", async () => {
  const { ctx, calls } = mockCtx([
    { body: { state: "JOB_STATE_RUNNING" } },
    { body: { batchPredictionJobs: [{ name: "j" }] } },
    { body: {} },
  ], { display });
  await jobGet.execute!({ jobId: "123" }, ctx);
  const list = await jobList.execute!({ filter: 'state="JOB_STATE_RUNNING"' }, ctx);
  const cancelled = await jobCancel.execute!({ jobId: "123" }, ctx);
  assertEquals(calls[0].url, `${BASE}/batchPredictionJobs/123`);
  assert(calls[1].url.startsWith(`${BASE}/batchPredictionJobs?`));
  assertEquals(list, { items: [{ name: "j" }], nextPageToken: undefined });
  assertEquals(calls[2].method, "POST");
  assertEquals(calls[2].url, `${BASE}/batchPredictionJobs/123:cancel`);
  assertEquals(cancelled, {
    cancelled: true,
    name: "projects/p1/locations/us-central1/batchPredictionJobs/123",
  });
});
