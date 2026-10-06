import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-prediction-job-cancel.ts";

const display = { projectId: "p1", location: "us-central1" };

Deno.test("batch-prediction-job-cancel: POSTs an empty body to :cancel in the name's own region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  const out = await action.execute!(
    { jobId: "projects/p2/locations/europe-west4/batchPredictionJobs/9" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://europe-west4-aiplatform.googleapis.com/v1/projects/p2/locations/europe-west4/batchPredictionJobs/9:cancel",
  );
  assertEquals(calls[0].body, "{}");
  assertEquals(out, {
    cancelled: true,
    name: "projects/p2/locations/europe-west4/batchPredictionJobs/9",
  });
});

Deno.test("batch-prediction-job-cancel: surfaces a failure instead of claiming success", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { status: "NOT_FOUND", message: "gone" } },
  }], { display });
  await assertRejects(
    () => Promise.resolve(action.execute!({ jobId: "1" }, ctx)),
    Error,
    "NOT_FOUND",
  );
  assert(action.idempotent === true);
});
